-- Run in Supabase SQL Editor after migration_public_booking.sql
-- Second meeting reminder changed from 30 to 20 minutes before — rename the
-- dedup-flag column to match.

alter table meetings rename column reminded_30m_at to reminded_20m_at;
