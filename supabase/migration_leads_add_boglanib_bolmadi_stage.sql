-- Adds the "Bog'lanib bo'lmadi" (could not reach) stage right after
-- "Potensial mijoz" in the CRM funnel.
alter table leads drop constraint leads_stage_check;
alter table leads add constraint leads_stage_check check (stage = ANY (ARRAY[
  'potensial_mijoz'::text, 'boglanib_bolmadi'::text, 'lead'::text, 'birinchi_uchrashuv'::text,
  'qayta_aloqa'::text, 'kp_berish'::text, 'etirozlar'::text, 'ikkinchi_uchrashuv'::text,
  'demo_berish'::text, 'yutildi'::text, 'yoqotildi'::text
]));
