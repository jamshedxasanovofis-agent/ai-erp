export type Lead = {
  id: string
  client_name: string
  company: string | null
  activity_name: string | null
  phone: string | null
  amount: number | null
  stage: string
  project_type: string | null
  employees_count: number | null
  budget: string | null
  submitted_at: string | null
  form_data: Record<string, unknown> | null
  pipeline_stage: string | null
  rejection_note: string | null
  temperature: string | null
  source: string | null
  region: string | null
  business_type: string | null
  language: string | null
  tier: string | null
  funnel: string
  deadline: string | null
  assigned_to: string | null
  assignee_ids: string[]
  booking_token: string | null
  closed_at: string | null
}

export type ProfileOption = { id: string; full_name: string; avatar_url?: string | null }
