-- Dynamic ERP — full schema
-- Run this once in Supabase SQL editor 

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. XODIMLAR / PROFILES (org structure)
-- =========================================================
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  position text,          -- lavozim
  department text,        -- boʻlim
  manager_id uuid references profiles(id) on delete set null,
  phone text,
  avatar_url text,
  salary numeric,
  address text,
  birth_date date,
  hired_at date default now(),
  created_at timestamptz default now()
);

-- =========================================================
-- 2. MIJOZLAR BAZASI
-- =========================================================
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  phone text,
  contact_person text,
  icp_portrait text,           -- ICP portret
  character_notes text,        -- mijoz xarakteri
  budget_level text,           -- pul imkoniyati
  loyalty_status text default 'oddiy' check (loyalty_status in ('sodiq','oddiy','qopol')),
  satisfaction_score int check (satisfaction_score between 1 and 10),
  usage_count int default 0,   -- necha marta xizmatdan foydalangan
  owner_id uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists client_interactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  note text not null,
  interaction_type text default 'note', -- note, problem, resolution, call
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- =========================================================
-- 3. SOTUV VORONKASI (CRM Kanban) + Google Sheets lead import
-- =========================================================
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  company text,
  phone text,
  source text,                 -- lid manbasi
  project_type text,
  integration text,
  team text,
  amount numeric,
  stage text default 'yangi' check (stage in ('yangi','aloqada','taklif','kelishuv','yutildi','yoqotildi')),
  assigned_to uuid references profiles(id),
  deadline date,
  sheet_row_ref text unique,   -- Google Sheets dedup key
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================================================
-- 4. LOYIHALAR
-- =========================================================
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references clients(id),
  status text default 'jarayonda' check (status in ('kutilmoqda','jarayonda','yopilgan','toxtatilgan')),
  progress int default 0 check (progress between 0 and 100),
  start_date date,
  end_date date,
  budget numeric,
  manager_id uuid references profiles(id),
  description text,
  created_at timestamptz default now()
);

create table if not exists project_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  field_changed text,
  old_value text,
  new_value text,
  comment text,
  changed_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- =========================================================
-- 5. TASK MENEJMENT
-- =========================================================
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  project_id uuid references projects(id) on delete set null,
  department text,
  assignee_id uuid references profiles(id),
  deadline timestamptz,
  checklist jsonb default '[]',      -- [{text, done}]
  progress int default 0 check (progress between 0 and 100),
  eisenhower int default 2 check (eisenhower between 1 and 4), -- 1 shoshilinch+muhim ... 4 aksincha
  status text default 'yangi' check (status in ('yangi','jarayonda','tekshiruvda','bajarildi')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- =========================================================
-- 6. XUJJATLAR
-- =========================================================
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,             -- login, shartnoma, boshqa
  login text,
  password_enc text,
  url text,
  notes text,
  folder text default 'Umumiy',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- =========================================================
-- 7. MOLIYA
-- =========================================================
create table if not exists finance_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('kirim','chiqim')),
  category text,
  amount numeric not null,
  occurred_on date default now(),
  project_id uuid references projects(id),
  contract_id uuid,
  description text,
  receipt_url text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists finance_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,          -- SMART maqsad nomi
  target_amount numeric not null,
  period_start date not null,
  period_end date not null,
  linked_contract_ids uuid[] default '{}',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- =========================================================
-- 8. SHARTNOMALAR
-- =========================================================
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  number text,
  client_id uuid references clients(id),
  project_id uuid references projects(id),
  status text default 'yangi' check (status in ('yangi','faol','kutilmoqda','yakunlangan','bekor_qilingan')),
  amount numeric,
  signed_date date,
  start_date date,
  end_date date,
  file_url text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table finance_transactions
  add constraint finance_transactions_contract_fk
  foreign key (contract_id) references contracts(id) on delete set null;

-- =========================================================
-- 9. TZ / DEMO
-- =========================================================
create table if not exists demo_requests (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  type text default 'demo' check (type in ('demo','tz')),
  status text default 'kutilmoqda' check (status in ('kutilmoqda','jarayonda','berildi','yakunlandi','rad_etildi')),
  requirements text,
  requested_at date default now(),
  scheduled_at timestamptz,
  deadline timestamptz,
  result text,
  demo_link text,
  attachment_url text,
  owner_id uuid references profiles(id),
  created_at timestamptz default now()
);

-- =========================================================
-- RLS — no login screen: app uses the anon key directly, so every
-- policy grants access to the "public" role (anyone with the anon key).
-- NOTE: this means anyone with the site link has full read/write/delete
-- access to all data below. Intentional per product decision.
-- =========================================================
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'profiles','clients','client_interactions','leads','projects','project_logs',
    'tasks','documents','finance_transactions','finance_goals','contracts','demo_requests'
  ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "authenticated_all" on %I;', t);
    execute format('drop policy if exists "public_all" on %I;', t);
    execute format(
      'create policy "public_all" on %I for all to public using (true) with check (true);', t
    );
  end loop;
end $$;

-- =========================================================
-- STORAGE — attachments bucket (contracts, receipts, TZ files, avatars)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

drop policy if exists "attachments_read" on storage.objects;
create policy "attachments_read" on storage.objects for select to public using (bucket_id = 'attachments');

drop policy if exists "attachments_write" on storage.objects;
create policy "attachments_write" on storage.objects for insert to public with check (bucket_id = 'attachments');

drop policy if exists "attachments_update" on storage.objects;
create policy "attachments_update" on storage.objects for update to public using (bucket_id = 'attachments');

drop policy if exists "attachments_delete" on storage.objects;
create policy "attachments_delete" on storage.objects for delete to public using (bucket_id = 'attachments');
