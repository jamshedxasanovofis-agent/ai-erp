-- Run in Supabase SQL Editor after migration_phase2_clients.sql
-- Phase 3: expense categories (matching the agency's real cost structure),
-- SMART goal funnel inputs (avg deal, conversion rate) for the funnel
-- calculator's "kerakli lead" output.

alter table finance_transactions add column if not exists expense_category text check (expense_category in (
  'ish_haqi','ijara','kommunal','server_hosting','ofis','reklama','buxgalteriya_yuridik',
  'amortizatsiya','reinvestitsiya','soliq','boshqa'
));

alter table finance_goals add column if not exists target_leads int;
alter table finance_goals add column if not exists avg_deal numeric;
alter table finance_goals add column if not exists conversion_rate_pct numeric;
