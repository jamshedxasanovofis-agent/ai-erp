-- Run in Supabase SQL Editor after migration_lead_booking_link.sql
-- Real lead data revealed a 4th business_type category ("savdo" — retail/
-- wholesale trade) that's just as common as "xizmat" but wasn't in the
-- original enum. Also backfill business_type from form_data.business_field
-- for the ~94 existing leads that already carry this signal but were never
-- auto-filled.

alter table leads drop constraint if exists leads_business_type_check;
alter table leads add constraint leads_business_type_check check (business_type in ('ishlab_chiqarish','talim','xizmat','savdo'));

update leads set business_type = case form_data->>'business_field'
  when 'ishlab_chiqarish' then 'ishlab_chiqarish'
  when 'ta''lim' then 'talim'
  when 'xizmat_ko''rsatish' then 'xizmat'
  when 'savdo_(ulgurji/chakana)' then 'savdo'
  else null
end
where business_type is null and form_data->>'business_field' is not null;
