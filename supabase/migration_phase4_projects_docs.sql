-- Run in Supabase SQL Editor after migration_phase3_finance.sql
-- Phase 4: billing-responsible employee, client photo, contract
-- auto-generation flag. (projects.color was already added in Phase 0.)

alter table projects add column if not exists billing_owner_id uuid references profiles(id);
alter table projects add column if not exists client_photo_url text;
alter table contracts add column if not exists auto_generated boolean default false;
