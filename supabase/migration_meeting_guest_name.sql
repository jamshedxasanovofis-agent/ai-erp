-- Run in Supabase SQL Editor after migration_phase6_telegram.sql
-- Meetings should be creatable without a CRM lead attached — add a free-text
-- guest name used only for display when lead_id is null.

alter table meetings add column if not exists guest_name text;
