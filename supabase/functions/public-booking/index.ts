// Public "book any open slot" endpoint for the per-lead booking link
// (/#/booking/lead/:token): lead is already known, identified by
// `leads.booking_token`, no phone/name entry needed.
// Runs under service-role so it can read the lead without opening a
// public RLS hole on `leads`/`meetings`.
// Deploy: supabase functions deploy public-booking --no-verify-jwt
// Secrets required: TELEGRAM_BOT_TOKEN, TELEGRAM_TEAM_GROUP_CHAT_ID (optional,
// booking still works without them, just skips the Telegram announcement)
import { createClient } from "npm:@supabase/supabase-js@2"

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")
const GROUP_CHAT_ID = Deno.env.get("TELEGRAM_TEAM_GROUP_CHAT_ID")
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" }

async function sendGroupMessage(text: string) {
  if (!BOT_TOKEN || !GROUP_CHAT_ID) return
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: GROUP_CHAT_ID, text, parse_mode: "HTML" }),
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS })
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS })

  const body = await req.json().catch(() => null)
  const leadToken: string | undefined = body?.lead_token
  const scheduledAt: string | undefined = body?.scheduled_at

  if (!scheduledAt || !leadToken) {
    return new Response(JSON.stringify({ error: "lead_token va scheduled_at majburiy" }), { status: 400, headers: JSON_HEADERS })
  }

  // Conflict check first, so we don't create a lead for a slot that's already gone.
  const { data: conflict } = await supabase
    .from("meetings")
    .select("id")
    .eq("status", "tasdiqlangan")
    .eq("scheduled_at", scheduledAt)
    .maybeSingle()
  if (conflict) {
    return new Response(JSON.stringify({ error: "Bu vaqt band qilindi, boshqasini tanlang" }), { status: 409, headers: JSON_HEADERS })
  }

  const { data: lead } = await supabase.from("leads").select("id, client_name, phone").eq("booking_token", leadToken).maybeSingle()
  if (!lead) {
    return new Response(JSON.stringify({ error: "Havola topilmadi" }), { status: 404, headers: JSON_HEADERS })
  }
  const leadId = lead.id
  const clientName = lead.client_name
  const contactLine = lead.phone ?? ""

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .insert({ lead_id: leadId, scheduled_at: scheduledAt, status: "tasdiqlangan" })
    .select("id")
    .single()
  if (meetingError || !meeting) {
    return new Response(JSON.stringify({ error: "Uchrashuv yaratib bo'lmadi" }), { status: 500, headers: JSON_HEADERS })
  }

  const when = new Date(scheduledAt).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent" })
  await sendGroupMessage(`🆕 Yangi uchrashuv band qilindi!\n<b>${clientName}</b>${contactLine ? ` — ${contactLine}` : ""}\nVaqt: ${when}`)

  return new Response(JSON.stringify({ ok: true, meeting_id: meeting.id, lead_id: leadId }), { headers: JSON_HEADERS })
})
