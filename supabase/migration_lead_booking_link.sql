-- Run in Supabase SQL Editor after migration_reminder_20m.sql
-- Per-lead booking link: every lead gets its own permanent token so staff can
-- copy a personalized link straight from the CRM card — no need to ask the
-- client for their phone/name again, we already know who they are.

alter table leads add column if not exists booking_token text unique default encode(gen_random_bytes(16), 'hex');
update leads set booking_token = encode(gen_random_bytes(16), 'hex') where booking_token is null;

-- Narrow public view so the booking page can greet the client by name and
-- validate the token, without exposing phone/amount/notes/etc to anon.
create or replace view public.lead_booking_info as
  select id, client_name, booking_token from leads;

grant select on public.lead_booking_info to anon;
