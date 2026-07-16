-- Run in Supabase SQL Editor after migration_phase1_crm.sql
-- Phase 2: client tier, contact-date tracking, referral/sarafan tracking.

alter table clients add column if not exists tier text check (tier in ('A','B','C','CS'));
alter table clients add column if not exists first_contact_date date;
alter table clients add column if not exists last_contact_date date;
alter table clients add column if not exists referral_source text;
alter table clients add column if not exists is_referral boolean default false;
