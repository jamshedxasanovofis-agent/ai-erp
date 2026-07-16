// Shared types for cross-cutting features introduced across the Phase 0-7
// ERP expansion. Page-local DB row types (Lead, Project, Task, Client, ...)
// stay defined in their own page files — this module only holds types that
// are genuinely shared across multiple pages/components.

export type Currency = "UZS" | "USD"

export type NotificationType =
  | "overdue_task"
  | "payment_due"
  | "new_lead_assigned"
  | "meeting_reminder"
  | "meeting_booked"

export type Notification = {
  id: string
  type: NotificationType
  entity_type: string
  entity_id: string
  recipient_id: string | null
  title: string
  body: string | null
  read_at: string | null
  sent_to_telegram_at: string | null
  created_at: string
}

export type ExchangeRate = {
  id: string
  rate_date: string
  usd_to_uzs: number
  created_by: string | null
  created_at: string
}

export type MeetingStatus = "kutilmoqda" | "tasdiqlangan" | "bekor_qilingan" | "otkazildi"

export type Meeting = {
  id: string
  lead_id: string | null
  client_id: string | null
  assignee_id: string | null
  scheduled_at: string
  duration_minutes: number
  status: MeetingStatus
  booking_token: string
  client_photo_url: string | null
  telegram_chat_id: string | null
  reminded_1h_at: string | null
  reminded_20m_at: string | null
  created_at: string
}

export type ClientTier = "A" | "B" | "C" | "CS"
export type LeadTier = "A" | "B" | "C"

export type ProjectColor = "indigo" | "emerald" | "amber" | "rose"
export type DocumentColor = "indigo" | "emerald" | "amber" | "rose" | "slate"
