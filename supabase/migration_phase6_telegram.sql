-- Run in Supabase SQL Editor after migration_phase5_dashboard.sql
-- Phase 6: Telegram bot support — employee chat ids + reminder dedup flags.

alter table profiles add column if not exists telegram_chat_id text;
alter table profiles add column if not exists telegram_username text;

alter table meetings add column if not exists reminded_1h_at timestamptz;
alter table meetings add column if not exists reminded_30m_at timestamptz;
