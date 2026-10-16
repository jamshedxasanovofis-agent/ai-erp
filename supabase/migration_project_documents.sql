-- New re-openable, editable document drafts (replaces write-only
-- proposals/document_templates for the 3 redesigned "AI Integrator" branded
-- documents: tz, kp, support_terms). One row per (project, doc_type) so
-- reopening the same document type later loads the same editable draft.
create table if not exists project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  doc_type text not null check (doc_type in ('tz', 'kp', 'support_terms')),
  data jsonb not null default '{}',
  generated_html text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (project_id, doc_type)
);
alter table project_documents enable row level security;
drop policy if exists "full_role_all" on project_documents;
create policy "full_role_all" on project_documents for all to public using (is_full_role()) with check (is_full_role());
