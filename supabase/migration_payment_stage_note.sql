-- Per-installment free-text comment shown next to date/amount/checkbox in
-- the project payment stage editor (Projects.tsx).
alter table payment_stages add column if not exists note text;
