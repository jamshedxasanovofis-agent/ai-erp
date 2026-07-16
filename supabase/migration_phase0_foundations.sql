-- Run in Supabase SQL Editor after migration_roles.sql
-- Phase 0 of the big ERP expansion: currency support, project colors, task
-- tags/timer, document project-linking, and the shared notifications table
-- used by both the in-app notification center (Phase 5) and the Telegram
-- bot reminders (Phase 6).

-- =========================================================
-- CURRENCY — UZS/USD selector across finance-adjacent tables.
-- Stored amounts are never converted; conversion happens on display using
-- the latest exchange_rates row.
-- =========================================================
alter table finance_transactions add column if not exists currency text check (currency in ('UZS','USD')) default 'UZS';
alter table contracts add column if not exists currency text check (currency in ('UZS','USD')) default 'UZS';
alter table payment_stages add column if not exists currency text check (currency in ('UZS','USD')) default 'UZS';

create table if not exists exchange_rates (
  id uuid primary key default gen_random_uuid(),
  rate_date date not null default current_date,
  usd_to_uzs numeric not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table exchange_rates enable row level security;
drop policy if exists "full_role_all" on exchange_rates;
create policy "full_role_all" on exchange_rates for all to authenticated using (is_full_role()) with check (is_full_role());

-- =========================================================
-- PROJECTS — 4-color accent for kanban cards.
-- =========================================================
alter table projects add column if not exists color text check (color in ('indigo','emerald','amber','rose')) default 'indigo';

-- =========================================================
-- TASKS — department tags + time-tracking.
-- =========================================================
alter table tasks add column if not exists tags text[] default '{}';
alter table tasks add column if not exists time_spent_seconds int default 0;
alter table tasks add column if not exists timer_started_at timestamptz;

-- =========================================================
-- DOCUMENTS — link to a project (in addition to the existing client_id)
-- and color-coding.
-- =========================================================
alter table documents add column if not exists project_id uuid references projects(id) on delete set null;
alter table documents add column if not exists color text check (color in ('indigo','emerald','amber','rose','slate')) default 'slate';

-- =========================================================
-- NOTIFICATIONS — shared in-app center + Telegram bot delivery log.
-- =========================================================
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('overdue_task','payment_due','new_lead_assigned','meeting_reminder','meeting_booked')),
  entity_type text not null,
  entity_id uuid not null,
  recipient_id uuid references profiles(id),
  title text not null,
  body text,
  read_at timestamptz,
  sent_to_telegram_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists notifications_recipient_idx on notifications(recipient_id, read_at);

alter table notifications enable row level security;
drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own" on notifications for select to authenticated using (recipient_id = auth.uid() or is_full_role());
drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own" on notifications for update to authenticated using (recipient_id = auth.uid() or is_full_role());
drop policy if exists "notifications_insert_auth" on notifications;
create policy "notifications_insert_auth" on notifications for insert to authenticated with check (true);
