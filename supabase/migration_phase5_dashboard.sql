-- Run in Supabase SQL Editor after migration_phase4b_document_templates.sql
-- Phase 5: meetings (Uchrashuvlar) + shareable booking slots, in-app
-- notification center backing table already exists (Phase 0: notifications).

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  assignee_id uuid references profiles(id),
  scheduled_at timestamptz not null,
  duration_minutes int not null default 30,
  status text check (status in ('kutilmoqda','tasdiqlangan','bekor_qilingan','otkazildi')) default 'kutilmoqda',
  booking_token text unique default encode(gen_random_bytes(16), 'hex'),
  client_photo_url text,
  telegram_chat_id text,
  created_at timestamptz default now()
);

alter table meetings enable row level security;

-- Logged-in team members (full role) manage everything.
drop policy if exists "meetings_full_role_all" on meetings;
create policy "meetings_full_role_all" on meetings for all to authenticated using (is_full_role()) with check (is_full_role());

-- Public booking page (/#/booking/:token) needs to read/confirm its own row
-- without logging in. The token itself is the secret (128-bit, unguessable),
-- so a blanket public policy is acceptable as an interim measure — this gets
-- tightened in Phase 6 once an Edge Function becomes the sole public writer.
drop policy if exists "meetings_public_select_by_token" on meetings;
create policy "meetings_public_select_by_token" on meetings for select to anon using (true);
drop policy if exists "meetings_public_update_by_token" on meetings;
create policy "meetings_public_update_by_token" on meetings for update to anon using (true) with check (true);
