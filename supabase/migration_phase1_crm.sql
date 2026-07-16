-- Run in Supabase SQL Editor after migration_phase0_foundations.sql
-- Phase 1: real 8-stage sales funnel (replaces the old 5-stage placeholder),
-- lead temperature (issiq/iliq/sovuq), region/business type/language/tier,
-- marketing-vs-call-center funnel split, and structured rejection reasons.

-- =========================================================
-- STAGE — drop the old constraint FIRST (it doesn't allow the new stage
-- values), then remap existing data, then apply the new constraint.
-- =========================================================
alter table leads drop constraint if exists leads_stage_check;

update leads set stage = 'potensial_mijoz' where stage = 'yangi';
update leads set stage = 'lead' where stage = 'aloqada';
update leads set stage = 'kp_berish' where stage = 'taklif';
update leads set stage = 'ikkinchi_uchrashuv' where stage = 'kelishuv';
-- 'yutildi' (won) and 'yoqotildi' (lost) are unchanged — still the two terminal states.

alter table leads add constraint leads_stage_check check (stage in (
  'potensial_mijoz','lead','birinchi_uchrashuv','qayta_aloqa','kp_berish',
  'etirozlar','ikkinchi_uchrashuv','demo_berish','yutildi','yoqotildi'
));
alter table leads alter column stage set default 'potensial_mijoz';

-- =========================================================
-- TEMPERATURE — lead warmth, independent of funnel stage.
-- =========================================================
alter table leads add column if not exists temperature text check (temperature in ('issiq','iliq','sovuq'));

-- =========================================================
-- CARD FIELDS — region, business type, language, tier, funnel split,
-- structured rejection reason, proposed meeting time.
-- =========================================================
alter table leads add column if not exists region text;
alter table leads add column if not exists business_type text check (business_type in ('ishlab_chiqarish','talim','xizmat'));
alter table leads add column if not exists language text check (language in ('uzbek','rus','tajik','english'));
alter table leads add column if not exists funnel text check (funnel in ('marketing','call_center')) default 'call_center';
update leads set funnel = 'call_center' where funnel is null;
alter table leads add column if not exists rejection_reason text check (rejection_reason in ('qimmat','sorash_edi','notogri_raqam','boshqa'));
alter table leads add column if not exists tier text check (tier in ('A','B','C'));
alter table leads add column if not exists meeting_time timestamptz;
