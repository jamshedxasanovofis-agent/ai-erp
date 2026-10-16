// Announces "demo marked done" to the team's Telegram group AND personally
// DMs each assignee (if their telegram_chat_id is known), plus writes the
// in-app bell notification — all three in one place so the client only has
// to fire-and-forget a single call.
//
// Called from DemoTracker.tsx with { demo_id }.
// Deployed with --no-verify-jwt (called by authenticated staff only, but
// kept consistent with the other notify functions in this project).
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

async function sendMessage(chatId: string | number, text: string) {
  if (!BOT_TOKEN) return
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS })
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS })

  const body = await req.json().catch(() => null)
  const demoId: string | undefined = body?.demo_id
  if (!demoId) {
    return new Response(JSON.stringify({ error: "demo_id majburiy" }), { status: 400, headers: JSON_HEADERS })
  }

  const { data: demo } = await supabase
    .from("demo_requests")
    .select("id, client_name, assignee_id, assignee_ids")
    .eq("id", demoId)
    .maybeSingle()
  if (!demo) {
    return new Response(JSON.stringify({ error: "Demo topilmadi" }), { status: 404, headers: JSON_HEADERS })
  }

  const assigneeIds: string[] = demo.assignee_ids?.length ? demo.assignee_ids : demo.assignee_id ? [demo.assignee_id] : []

  let assigneeProfiles: { id: string; full_name: string; telegram_chat_id: string | null }[] = []
  if (assigneeIds.length) {
    const { data } = await supabase.from("profiles").select("id, full_name, telegram_chat_id").in("id", assigneeIds)
    assigneeProfiles = data ?? []
  } else {
    const { data } = await supabase.from("profiles").select("id, full_name, telegram_chat_id")
    assigneeProfiles = data ?? []
  }

  const text = [
    "✅ Demo bajarildi — uchrashuv belgilang",
    `👤 ${esc(demo.client_name)}`,
    assigneeProfiles.length ? `🧑‍💼 Mas'ul: ${esc(assigneeProfiles.map((p) => p.full_name).join(", "))}` : null,
  ].filter(Boolean).join("\n")

  if (GROUP_CHAT_ID) await sendMessage(GROUP_CHAT_ID, text)
  for (const p of assigneeProfiles) {
    if (p.telegram_chat_id) await sendMessage(p.telegram_chat_id, text)
    await supabase.from("notifications").insert({
      type: "demo_completed",
      entity_type: "demo_request",
      entity_id: demo.id,
      recipient_id: p.id,
      title: "Demo bajarildi — uchrashuv belgilang",
      body: `${demo.client_name} uchun demo tayyor. Endi mijoz bilan uchrashuv/qo'ng'iroqni rejalashtirish kerak.`,
    })
  }

  return new Response(JSON.stringify({ ok: true, notified: assigneeProfiles.length, telegram: !!(BOT_TOKEN && GROUP_CHAT_ID) }), { headers: JSON_HEADERS })
})
