-- Run in Supabase SQL Editor after migration_phase4_projects_docs.sql
-- Phase 4b: generic document_templates table for the 7 new contract-appendix
-- generators (TZ, payment schedule, support act, access act, acceptance act,
-- NDA, change request). The 2 pre-existing doc types (kp, support) keep
-- living in the "proposals" table untouched.

create table if not exists document_templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  doc_type text not null,
  generated_html text,
  created_at timestamptz default now()
);

alter table document_templates enable row level security;

drop policy if exists "full_role_all" on document_templates;
create policy "full_role_all" on document_templates for all to authenticated using (is_full_role()) with check (is_full_role());
