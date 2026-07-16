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
  return new Date(iso).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
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
    .select("id, title, amount, contract_id, contracts(project_id, projects(billing_owner_id, name))")
    .eq("status", "kutilmoqda")
    .lt("due_date", today)
  for (const s of (overdue ?? []) as any[]) {
    await supabase.from("payment_stages").update({ status: "kechikdi" }).eq("id", s.id)
    const billingOwner = s.contracts?.projects?.billing_owner_id
    if (billingOwner) {
      await supabase.from("notifications").insert({
        type: "payment_due", entity_type: "payment_stage", entity_id: s.id, recipient_id: billingOwner,
        title: "To'lov muddati o'tdi", body: `${s.contracts?.projects?.name ?? ""} — ${s.title}`,
      })
    }
  }
}

Deno.serve(async () => {
  await dispatchMeetingReminders()
  await flipOverduePayments()
  return new Response("ok")
})
