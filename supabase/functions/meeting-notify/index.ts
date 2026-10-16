// Announces a meeting event (created via the "+" button in Dashboard, or
// confirmed via a booking link — either the assignee's personal link
// /#/booking/:token or the lead's own link /#/booking/lead/:token) to the
// team's Telegram group, and — when the meeting has an assignee — creates
// an in-app notification for that person.
//
// Called from the client with { meeting_id, event: "created" | "confirmed" }.
// Deployed with --no-verify-jwt since the personal booking link is a public,
// unauthenticated page (the guest picking a slot has no Supabase session).
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

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

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
  const meetingId: string | undefined = body?.meeting_id
  const event: "created" | "confirmed" = body?.event === "confirmed" ? "confirmed" : "created"
  if (!meetingId) {
    return new Response(JSON.stringify({ error: "meeting_id majburiy" }), { status: 400, headers: JSON_HEADERS })
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, scheduled_at, assignee_id, assignee_ids, guest_name, lead_id")
    .eq("id", meetingId)
    .maybeSingle()
  if (!meeting) {
    return new Response(JSON.stringify({ error: "Uchrashuv topilmadi" }), { status: 404, headers: JSON_HEADERS })
  }
  const assigneeIds: string[] = meeting.assignee_ids?.length ? meeting.assignee_ids : meeting.assignee_id ? [meeting.assignee_id] : []

  let who = meeting.guest_name || "Mehmon"
  let contact = ""
  if (meeting.lead_id) {
    const { data: lead } = await supabase.from("leads").select("client_name, phone").eq("id", meeting.lead_id).maybeSingle()
    if (lead) {
      who = lead.client_name || who
      contact = lead.phone || ""
    }
  }

  let assigneeNames: string[] = []
  if (assigneeIds.length) {
    const { data: assigneeProfiles } = await supabase.from("profiles").select("full_name").in("id", assigneeIds)
    assigneeNames = (assigneeProfiles ?? []).map((p) => p.full_name).filter(Boolean)
  }

  const when = new Date(meeting.scheduled_at).toLocaleString("uz-UZ", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent",
  })

  const label = event === "created" ? "🆕 Yangi uchrashuv belgilandi" : "✅ Uchrashuv tasdiqlandi"
  const lines = [
    `${label}`,
    `👤 ${esc(who)}${contact ? ` — ${esc(contact)}` : ""}`,
    `🕐 ${when}`,
    assigneeNames.length ? `🧑‍💼 Mas'ul: ${esc(assigneeNames.join(", "))}` : null,
  ].filter(Boolean)
  await sendGroupMessage(lines.join("\n"))

  for (const recipientId of assigneeIds) {
    await supabase.from("notifications").insert({
      type: event === "created" ? "meeting_assigned" : "meeting_confirmed",
      entity_type: "meeting",
      entity_id: meeting.id,
      recipient_id: recipientId,
      title: event === "created" ? "Sizga yangi uchrashuv belgilandi" : "Uchrashuvingiz tasdiqlandi",
      body: `${who} — ${when}`,
    })
  }

  return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS })
})
