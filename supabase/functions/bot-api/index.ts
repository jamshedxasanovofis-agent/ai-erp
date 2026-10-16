// Single HTTP API for the owner's personal Telegram/calendar assistant
// (separate Google Apps Script project, "efficiency-agent") — everything the
// bot needs from AI ERP goes through this one endpoint instead of the bot
// holding a service-role key or talking to Postgres directly.
//
// Auth: header "Authorization: Bearer <BOT_API_SECRET>".
// Body: { action, ...params }. See ACTIONS below.
//
// Deploy: supabase functions deploy bot-api --no-verify-jwt
// Secret required: BOT_API_SECRET (set via `supabase secrets set BOT_API_SECRET=...`)
import { createClient } from "npm:@supabase/supabase-js@2"

const BOT_API_SECRET = Deno.env.get("BOT_API_SECRET")!
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" }

function ok(data: unknown) {
  return new Response(JSON.stringify({ ok: true, ...(data as object) }), { headers: JSON_HEADERS })
}
function fail(error: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error }), { status, headers: JSON_HEADERS })
}

async function listMyOpenItems(profileId: string) {
  const now = new Date().toISOString()
  const in30d = new Date(Date.now() + 30 * 86400000).toISOString()
  const [{ data: meetings }, { data: tasks }] = await Promise.all([
    supabase
      .from("meetings")
      .select("id, scheduled_at, duration_minutes, status, format, guest_name, lead_id, assignee_id, assignee_ids")
      .neq("status", "bekor_qilingan")
      .gte("scheduled_at", now)
      .lte("scheduled_at", in30d),
    supabase
      .from("tasks")
      .select("id, title, deadline, status, assignee_id, assignee_ids")
      .neq("status", "bajarildi")
      .not("deadline", "is", null),
  ])
  const mine = (ids: { assignee_id: string | null; assignee_ids: string[] | null }) =>
    ids.assignee_ids?.length ? ids.assignee_ids.includes(profileId) : ids.assignee_id === profileId

  const myMeetings = (meetings ?? []).filter(mine)
  const myTasks = (tasks ?? []).filter(mine)

  // Enrich meetings with lead name (bot has no direct table access to join itself).
  const leadIds = [...new Set(myMeetings.map((m) => m.lead_id).filter(Boolean))]
  let leadNames: Record<string, string> = {}
  if (leadIds.length) {
    const { data: leads } = await supabase.from("leads").select("id, client_name").in("id", leadIds as string[])
    leadNames = Object.fromEntries((leads ?? []).map((l) => [l.id, l.client_name]))
  }

  return {
    meetings: myMeetings.map((m) => ({
      id: m.id, scheduled_at: m.scheduled_at, duration_minutes: m.duration_minutes,
      format: m.format, who: m.guest_name || (m.lead_id ? leadNames[m.lead_id] : null) || null,
    })),
    tasks: myTasks.map((t) => ({ id: t.id, title: t.title, deadline: t.deadline })),
  }
}

async function listMyTasks(profileId: string) {
  const { data } = await supabase
    .from("tasks")
    .select("id, title, deadline, checklist, assignee_id, assignee_ids")
    .neq("status", "bajarildi")
    .order("created_at", { ascending: false })
    .limit(50)
  const mine = (t: { assignee_id: string | null; assignee_ids: string[] | null }) =>
    t.assignee_ids?.length ? t.assignee_ids.includes(profileId) : t.assignee_id === profileId
  const tasks = (data ?? []).filter(mine).slice(0, 30)
  return { tasks: tasks.map((t) => ({ id: t.id, title: t.title, deadline: t.deadline, checklist: t.checklist })) }
}

async function createTask(p: {
  profile_id: string; title: string; description?: string; deadline?: string
  department?: string; checklist?: string[]
}) {
  const checklist = (p.checklist ?? []).map((text) => ({ text, done: false }))
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: p.title,
      description: p.description || null,
      department: p.department || null,
      deadline: p.deadline || null,
      assignee_id: p.profile_id,
      assignee_ids: [p.profile_id],
      status: "yangi",
      checklist,
      timer_started_at: new Date().toISOString(),
    })
    .select("id, title")
    .single()
  if (error) throw new Error(error.message)
  return { task_id: data.id, title: data.title }
}

async function addChecklistItem(taskId: string, itemText: string) {
  const { data: task, error: fetchErr } = await supabase.from("tasks").select("checklist").eq("id", taskId).single()
  if (fetchErr || !task) throw new Error(fetchErr?.message ?? "Vazifa topilmadi")
  const checklist = [...(task.checklist ?? []), { text: itemText, done: false }]
  const { error } = await supabase.from("tasks").update({ checklist }).eq("id", taskId)
  if (error) throw new Error(error.message)
  return {}
}

async function setTaskDeadline(taskId: string, deadline: string) {
  const { error } = await supabase.from("tasks").update({ deadline }).eq("id", taskId)
  if (error) throw new Error(error.message)
  return {}
}

async function completeTask(taskId: string) {
  const { data: task, error: fetchErr } = await supabase
    .from("tasks")
    .select("timer_started_at, time_spent_seconds")
    .eq("id", taskId)
    .single()
  if (fetchErr || !task) throw new Error(fetchErr?.message ?? "Vazifa topilmadi")
  const patch: Record<string, unknown> = { status: "bajarildi", progress: 100 }
  if (task.timer_started_at) {
    const delta = Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000)
    patch.time_spent_seconds = (task.time_spent_seconds ?? 0) + delta
    patch.timer_started_at = null
  }
  const { error } = await supabase.from("tasks").update(patch).eq("id", taskId)
  if (error) throw new Error(error.message)
  return {}
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS })
  if (req.method !== "POST") return fail("Method not allowed", 405)

  const auth = req.headers.get("Authorization") || ""
  if (auth !== `Bearer ${BOT_API_SECRET}`) return fail("Unauthorized", 401)

  const body = await req.json().catch(() => null)
  if (!body?.action) return fail("action majburiy")

  try {
    switch (body.action) {
      case "list_my_open_items":
        return ok(await listMyOpenItems(body.profile_id))
      case "list_my_tasks":
        return ok(await listMyTasks(body.profile_id))
      case "create_task":
        return ok(await createTask(body))
      case "add_checklist_item":
        return ok(await addChecklistItem(body.task_id, body.item_text))
      case "set_task_deadline":
        return ok(await setTaskDeadline(body.task_id, body.deadline))
      case "complete_task":
        return ok(await completeTask(body.task_id))
      default:
        return fail("Noma'lum action: " + body.action)
    }
  } catch (e) {
    return fail(String((e as Error).message ?? e), 500)
  }
})
