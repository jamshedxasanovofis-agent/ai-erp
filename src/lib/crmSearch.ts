import { supabase } from "@/lib/supabase"

// Strips everything but digits so phone matching works regardless of
// formatting differences (+998, spaces, dashes, parentheses) on either side.
export function normalizePhoneDigits(s: string) {
  return s.replace(/\D/g, "")
}

export type LeadOption = {
  id: string
  client_name: string
  phone: string | null
  company: string | null
  employees_count: number | null
  budget: string | null
  source: string | null
  region: string | null
  business_type: string | null
  language: string | null
  temperature: string | null
  tier: string | null
  project_type: string | null
  deadline: string | null
}

export const LEAD_OPTION_SELECT = "id, client_name, phone, company, employees_count, budget, source, region, business_type, language, temperature, tier, project_type, deadline"

// Used by the Projects "attach lead" picker.
export async function searchLeadByPhone(phone: string): Promise<LeadOption[]> {
  if (!phone.trim()) return []
  const { data } = await supabase
    .from("leads")
    .select(LEAD_OPTION_SELECT)
    .ilike("phone", `%${phone.trim()}%`)
    .limit(5)
  return (data as LeadOption[]) ?? []
}

export type ClientMatch = { id: string; name: string; brand: string | null; phone: string | null }

// Used by CRM's unified search box to find already-converted clients (leads
// are already loaded client-side in Crm.tsx, so no query needed for those).
export async function searchClients(query: string): Promise<ClientMatch[]> {
  const q = query.trim()
  if (!q) return []
  const digits = normalizePhoneDigits(q)
  const orParts = [`name.ilike.%${q}%`, `phone.ilike.%${q}%`]
  if (digits.length >= 5) orParts.push(`phone.ilike.%${digits}%`)
  const { data } = await supabase
    .from("clients")
    .select("id, name, brand, phone")
    .or(orParts.join(","))
    .limit(5)
  return (data as ClientMatch[]) ?? []
}
