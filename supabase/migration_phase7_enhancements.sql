-- Run in Supabase SQL Editor after migration_payment_stage_receipt.sql
-- Phase 7: rejection reasons (sifatsiz_lid, arxiv), generic field-change /
-- deletion history, per-project exchange rate, full lead->project mirror
-- fields, reliable payment-stage <-> finance_transaction link, salary
-- payments module.

-- =========================================================
-- REJECTION REASONS — add "Sifatsiz lid" and "Arxiv"
-- =========================================================
alter table leads drop constraint if exists leads_pipeline_stage_check;
alter table leads add constraint leads_pipeline_stage_check check (pipeline_stage in (
  'qimmat','qiziqdi','qaror_qabul_qiluvchi_emas','sifatsiz_lid','arxiv','boshqa'
));

-- =========================================================
-- GENERIC FIELD-CHANGE / DELETION HISTORY
-- =========================================================
create table if not exists entity_field_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  field_key text not null,
  field_label text,
  old_value text,
  new_value text,
  changed_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index if not exists entity_field_history_entity_idx on entity_field_history(entity_type, entity_id);

alter table entity_field_history enable row level security;
drop policy if exists "public_all" on entity_field_history;
create policy "public_all" on entity_field_history for all to public using (true) with check (true);

-- =========================================================
-- EXCHANGE RATE — per contract / payment stage / transaction
-- =========================================================
alter table contracts add column if not exists exchange_rate numeric;
alter table payment_stages add column if not exists exchange_rate numeric;
alter table finance_transactions add column if not exists exchange_rate numeric;

-- =========================================================
-- RELIABLE payment_stage <-> finance_transaction LINK
-- (lets us reverse a wrongly-checked "paid" box)
-- =========================================================
alter table finance_transactions add column if not exists payment_stage_id uuid references payment_stages(id) on delete set null;

-- =========================================================
-- PROJECTS — mirror fields pulled from the attached lead card
-- =========================================================
alter table projects add column if not exists phone text;
alter table projects add column if not exists source text;
alter table projects add column if not exists region text;
alter table projects add column if not exists business_type text;
alter table projects add column if not exists language text;
alter table projects add column if not exists temperature text;
alter table projects add column if not exists tier text;
alter table projects add column if not exists project_type text;
alter table projects add column if not exists deadline date;

-- =========================================================
-- SALARY PAYMENTS — "Ish haqi" module
-- =========================================================
create table if not exists salary_payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  period_month date not null, -- 1-е число месяца
  amount numeric not null,
  currency text default 'UZS',
  exchange_rate numeric,
  finance_transaction_id uuid references finance_transactions(id) on delete set null,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index if not exists salary_payments_profile_idx on salary_payments(profile_id, period_month);

alter table salary_payments enable row level security;
drop policy if exists "public_all" on salary_payments;
create policy "public_all" on salary_payments for all to public using (true) with check (true);
