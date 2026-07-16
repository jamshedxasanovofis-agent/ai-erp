-- Run in Supabase SQL Editor after migration_meeting_guest_name.sql
-- General (non-token) public booking link: expose only busy timestamps to
-- anon via a narrow view (no lead/client PII), the actual booking write
-- happens through the `public-booking` Edge Function (service-role, so it
-- can safely search/create leads by phone without a public RLS hole).

create or replace view public.meeting_slots as
  select scheduled_at, duration_minutes from meetings where status = 'tasdiqlangan';

grant select on public.meeting_slots to anon;
