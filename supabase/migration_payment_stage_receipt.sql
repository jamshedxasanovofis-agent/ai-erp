-- Payment stages created from the project form (Projects.tsx) need to carry
-- an attached receipt/file, same as finance_transactions already does.
alter table payment_stages add column if not exists receipt_url text;
