// Scheduled job (pg_cron -> this function every ~5-10 minutes):
// - sends 1h and 20min Telegram reminders for confirmed meetings, personally
//   to every 'full'-role staff member (both SEO/CEO are equally responsible,
//   no per-meeting assignee needed) — plus the team group chat if configured
// - writes matching rows into `notifications` (in-app bell)
// - flips overdue payment_stages to 'kechikdi' and notifies the project's
//   billing owner, if one is set
// Deploy: supabase functions deploy reminder-dispatch
// Schedule (SQL, run once): select cron.schedule('reminder-dispatch', '*/5 * * * *',
//   $$ select net.http_post(url:='https://<project-ref>.supabase.co/functions/v1/reminder-dispatch',
//      headers:=jsonb_build_object('Authorization','Bearer <service-role-key>')) $$);
// Secrets required: TELEGRAM_BOT_TOKEN. TELEGRAM_TEAM_GROUP_CHAT_ID optional.
import { createClient } from "npm:@supabase/supabase-js@2"

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!
const GROUP_CHAT_ID = Deno.env.get("TELEGRAM_TEAM_GROUP_CHAT_ID")
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

async function sendMessage(chatId: string | number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  })
}

function fmtTime(iso: string) {
  // Edge Function runs in UTC — must pin to Tashkent explicitly, otherwise
  // the bot reports times 5 hours behind local.
  return new Date(iso).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent" })
}

async function getFullRoleStaff() {
  const { data } = await supabase.from("profiles").select("id, telegram_chat_id").eq("role", "full").not("telegram_chat_id", "is", null)
  return (data ?? []) as { id: string; telegram_chat_id: string }[]
}

async function dispatchMeetingReminders() {
  const now = Date.now()
  const staff = await getFullRoleStaff()

  async function windowMeetings(minMinutes: number, maxMinutes: number, flagCol: "reminded_1h_at" | "reminded_20m_at") {
    const from = new Date(now + minMinutes * 60000).toISOString()
    const to = new Date(now + maxMinutes * 60000).toISOString()
    const { data } = await supabase
      .from("meetings")
      .select("id, scheduled_at, lead_id, guest_name, client_photo_url, reminded_1h_at, reminded_20m_at, leads(client_name)")
      .eq("status", "tasdiqlangan")
      .gte("scheduled_at", from)
      .lte("scheduled_at", to)
      .is(flagCol, null)
    return data ?? []
  }

  async function notifyStaff(m: any, text: string, type: string, title: string) {
    const clientName = m.leads?.client_name ?? m.guest_name ?? "Lid biriktirilmagan"
    if (GROUP_CHAT_ID) await sendMessage(GROUP_CHAT_ID, text)
    for (const p of staff) {
      await sendMessage(p.telegram_chat_id, text)
      await supabase.from("notifications").insert({
        type, entity_type: "meeting", entity_id: m.id, recipient_id: p.id,
        title, body: clientName,
        sent_to_telegram_at: new Date().toISOString(),
      })
    }
  }

  const oneHour = await windowMeetings(55, 65, "reminded_1h_at")
  for (const m of oneHour as any[]) {
    const clientName = m.leads?.client_name ?? m.guest_name ?? "Lid biriktirilmagan"
    const text = `⏰ 1 soatdan keyin uchrashuv bor!\n<b>${clientName}</b>\nVaqt: ${fmtTime(m.scheduled_at)}\n\nMijozga eslatib qo'ying.`
    await notifyStaff(m, text, "meeting_reminder", "1 soatdan keyin uchrashuv")
    await supabase.from("meetings").update({ reminded_1h_at: new Date().toISOString() }).eq("id", m.id)
  }

  const twentyMin = await windowMeetings(15, 25, "reminded_20m_at")
  for (const m of twentyMin as any[]) {
    const clientName = m.leads?.client_name ?? m.guest_name ?? "Lid biriktirilmagan"
    const text = `🔔 20 daqiqadan keyin uchrashuv bor, unutmang: <b>${clientName}</b> — ${fmtTime(m.scheduled_at)}`
    await notifyStaff(m, text, "meeting_reminder", "20 daqiqadan keyin uchrashuv")
    await supabase.from("meetings").update({ reminded_20m_at: new Date().toISOString() }).eq("id", m.id)
  }
}

async function flipOverduePayments() {
  const today = new Date().toISOString().slice(0, 10)
  const { data: overdue } = await supabase
    .from("payment_stages")
    .select("id, title, amount, contract_id, contracts(project_id, projects(billing_owner_id, billing_owner_ids, name))")
    .eq("status", "kutilmoqda")
    .lt("due_date", today)
  for (const s of (overdue ?? []) as any[]) {
    await supabase.from("payment_stages").update({ status: "kechikdi" }).eq("id", s.id)
    const proj = s.contracts?.projects
    const owners: string[] = proj?.billing_owner_ids?.length ? proj.billing_owner_ids : proj?.billing_owner_id ? [proj.billing_owner_id] : []
    for (const recipientId of owners) {
      await supabase.from("notifications").insert({
        type: "payment_due", entity_type: "payment_stage", entity_id: s.id, recipient_id: recipientId,
        title: "To'lov muddati o'tdi", body: `${proj?.name ?? ""} — ${s.title}`,
      })
    }
  }
}

const REMINDER_KIND_LABEL: Record<string, string> = {
  call_back: "Qo'ng'iroq qilish",
  clarify_answer: "Javobni aniqlashtirish",
  zoom: "Zoom haqida eslatish",
  payment: "To'lov haqida eslatish",
  other: "Eslatma",
}

async function dispatchLeadReminders() {
  const now = new Date().toISOString()
  const { data: due } = await supabase
    .from("lead_reminders")
    .select("id, lead_id, assignee_id, remind_at, kind, note, leads(client_name, phone)")
    .is("done_at", null)
    .is("notified_at", null)
    .lte("remind_at", now)
  for (const r of (due ?? []) as any[]) {
    const clientName = r.leads?.client_name ?? "Lid"
    const kindLabel = REMINDER_KIND_LABEL[r.kind] ?? r.kind
    const text = `🔔 Eslatma: ${kindLabel}\n👤 <b>${clientName}</b>${r.leads?.phone ? ` — ${r.leads.phone}` : ""}${r.note ? `\n📝 ${r.note}` : ""}`
    if (GROUP_CHAT_ID) await sendMessage(GROUP_CHAT_ID, text)
    if (r.assignee_id) {
      const { data: profile } = await supabase.from("profiles").select("telegram_chat_id").eq("id", r.assignee_id).maybeSingle()
      if (profile?.telegram_chat_id) await sendMessage(profile.telegram_chat_id, text)
      await supabase.from("notifications").insert({
        type: "lead_reminder", entity_type: "lead", entity_id: r.lead_id, recipient_id: r.assignee_id,
        title: kindLabel, body: clientName, sent_to_telegram_at: new Date().toISOString(),
      })
    }
    await supabase.from("lead_reminders").update({ notified_at: new Date().toISOString() }).eq("id", r.id)
  }
}

Deno.serve(async () => {
  await dispatchMeetingReminders()
  await flipOverduePayments()
  await dispatchLeadReminders()
  return new Response("ok")
})
