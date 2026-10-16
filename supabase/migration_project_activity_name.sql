-- Projects were missing "activity_name" (Faoliyat nomi), a field that exists
-- on leads and should transfer over when a lead is attached to a project.
alter table projects add column if not exists activity_name text;
