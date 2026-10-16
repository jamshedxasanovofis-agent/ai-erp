// Replaces the old, unreliable n8n "Google Sheets Trigger -> Create Lead in
// Supabase" workflow (kept erroring out and dropping leads). Instead of
// n8n polling the sheet, we poll it ourselves on a pg_cron schedule (see
// bottom of this file for the schedule SQL) by fetching the sheet's public
// CSV export directly — free, no third-party service in the loop.
//
// The marketing team adds new TABS to this same spreadsheet on their own
// (one per ad campaign) without telling anyone — so instead of hardcoding a
// single tab's gid, every run we list all tabs and sync all of them.
//
// Auth: a Google service account (GOOGLE_SERVICE_ACCOUNT_JSON secret, the
// full key file contents). The spreadsheet's owner must keep it shared with
// the service account's client_email, or link-shared "Anyone — Viewer".
//
// Also announces each newly-synced lead in the team's Telegram group.
//
// Deploy: supabase functions deploy sync-leads-sheet --no-verify-jwt
// Secrets required: GOOGLE_SERVICE_ACCOUNT_JSON; TELEGRAM_BOT_TOKEN,
// TELEGRAM_TEAM_GROUP_CHAT_ID (optional — sync still runs without them, just
// skips the Telegram announcement).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const SPREADSHEET_ID = "1JHkbnvy_QYYAqbkfyXqSs-jd89wX-MJrlhgeV1Ce4oA"
const SERVICE_ACCOUNT = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") ?? "null") as
  | { client_email: string; private_key: string }
  | null

const b64url = (data: string | Uint8Array) => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/** OAuth access token for the service account (read-only Sheets scope). */
async function getAccessToken(): Promise<string> {
  if (!SERVICE_ACCOUNT) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set")
  const now = Math.floor(Date.now() / 1000)
  const unsigned =
    b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    b64url(JSON.stringify({
      iss: SERVICE_ACCOUNT.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }))
  const pem = SERVICE_ACCOUNT.private_key.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "")
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)))
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: unsigned + "." + b64url(sig) }),
  })
  const data = await resp.json()
  if (!data.access_token) throw new Error("Google token request failed: " + JSON.stringify(data))
  return data.access_token
}

/** Every tab's rows (header first), via the Sheets API. */
async function fetchAllTabs(): Promise<{ title: string; rows: string[][] }[]> {
  const headers = { Authorization: "Bearer " + (await getAccessToken()) }
  const metaResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`, { headers })
  if (!metaResp.ok) throw new Error("list tabs failed: " + metaResp.status + " " + (await metaResp.text()))
  const meta = await metaResp.json()
  const tabs: { title: string; rows: string[][] }[] = []
  for (const s of (meta.sheets ?? []) as any[]) {
    const title: string = s.properties.title
    const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent("'" + title.replace(/'/g, "''") + "'")}`, { headers })
    if (!resp.ok) {
      console.error(`tab "${title}" failed: ${resp.status} ${await resp.text()}`)
      continue
    }
    tabs.push({ title, rows: ((await resp.json()).values ?? []) as string[][] })
  }
  return tabs
}

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")
const GROUP_CHAT_ID = Deno.env.get("TELEGRAM_TEAM_GROUP_CHAT_ID")

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

type NewLead = {
  client_name: string
  phone: string
  source: string | null
  project_type: string | null
  employees_count: number | null
  budget: string | null
  region: string | null
  form_data: { decision_role?: string; launch_timeline?: string; telegram_username?: string; main_problem?: string }
}

const DECISION_ROLE_LABEL: Record<string, string> = {
  "-kompaniya_egasiman": "Kompaniya egasi",
  "direktor": "Direktor",
  "bo'lim_rahbari": "Bo'lim rahbari",
  "xodim": "Xodim",
  "tavsiya_qiluvchi": "Tavsiya qiluvchi",
}

async function announceLead(l: NewLead) {
  if (!BOT_TOKEN || !GROUP_CHAT_ID) return
  const role = l.form_data?.decision_role
  const timeline = l.form_data?.launch_timeline
  const username = l.form_data?.telegram_username
  const lines = [
    "🆕 <b>Yangi lid</b>",
    `👤 ${esc(l.client_name)}`,
    `📞 ${esc(formatUzPhone(l.phone))}`,
    username ? `💬 Telegram: ${esc(username)}` : null,
    l.source ? `📱 Manba: ${esc(l.source)}` : null,
    l.project_type ? `🎯 Muammo: ${esc(l.project_type)}` : null,
    l.employees_count ? `👥 Xodimlar: ${l.employees_count}+` : null,
    l.budget ? `💰 Byudjet: ${esc(l.budget.replace(/_/g, " "))}` : null,
    l.region ? `📍 Hudud: ${esc(l.region)}` : null,
    role ? `🧑‍💼 Kompaniyada roli: ${esc(DECISION_ROLE_LABEL[role] ?? role)}` : null,
    timeline ? `⏱ Joriy etish muddati: ${esc(timeline.replace(/_/g, " "))}` : null,
  ].filter(Boolean)
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: GROUP_CHAT_ID, text: lines.join("\n"), parse_mode: "HTML" }),
  })
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// Same grouping as src/lib/utils.ts formatUzPhone — duplicated here since
// Edge Functions can't import from the frontend src tree.
function formatUzPhone(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "")
  const hasCountryCode = digits.startsWith("998")
  const local = hasCountryCode ? digits.slice(3) : digits
  if (local.length !== 9) return raw
  const grouped = `${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`
  return hasCountryCode ? `+998 ${grouped}` : grouped
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
}
const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" }

function parseEmployeesCount(range: string): number | null {
  const m = range.match(/\d+/)
  return m ? parseInt(m[0], 10) : null
}

// Newer Meta lead forms sometimes add questions ("Ismingiz", "Telegram
// username", "Telefon raqamingizni yozing") whose answers land in
// DIFFERENT column slots than the original full_name/phone columns used —
// Meta's CSV export re-shuffles values across whichever historically-named
// column it thinks matches, and it isn't reliable. Instead of trusting a
// fixed column position for phone/username/name, we pool every plausible
// candidate cell for a row and classify each one by what it LOOKS like.
function isUsernameLike(s: string): boolean {
  return s.trim().startsWith("@")
}
function isPhoneLike(s: string): boolean {
  const digits = s.replace(/^p:/, "").replace(/\D/g, "")
  return digits.length >= 9 && digits.length <= 13
}
function cleanPhone(s: string): string {
  return s.replace(/^p:/, "").trim()
}

function pickPhone(candidates: string[]): string | null {
  for (const c of candidates) if (c && isPhoneLike(c)) return cleanPhone(c)
  return null
}
function pickUsername(candidates: string[]): string | null {
  for (const c of candidates) if (c && isUsernameLike(c)) return c.trim()
  return null
}
function pickName(candidates: string[]): string {
  const valid = candidates.filter((c) => c && !isPhoneLike(c) && !isUsernameLike(c))
  if (valid.length === 0) return ""
  // Prefer the fullest-looking name (e.g. "Anvarov Nodir" over "Nodirjon").
  return valid.reduce((a, b) => (b.length > a.length ? b : a))
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS })

  let tabs: { title: string; rows: string[][] }[]
  try {
    tabs = await fetchAllTabs()
  } catch (e) {
    return new Response(JSON.stringify({ error: `sheet fetch failed: ${(e as Error).message}` }), { status: 502, headers: JSON_HEADERS })
  }

  const { data: existing } = await supabase.from("leads").select("sheet_row_ref").not("sheet_row_ref", "is", null)
  const known = new Set((existing ?? []).map((r) => (r.sheet_row_ref as string).replace(/^l:/, "")))
  const toInsert = []

  for (const tab of tabs) {
  const [header, ...dataRows] = tab.rows // header row drives lookup for the question columns, which shift around
  if (!header) continue

  // The Meta-system columns (id..platform, indices 0-11) are always in this
  // fixed order. Everything after that — the form's QUESTION columns — is
  // looked up by header name/prefix, never by position: Meta reshuffles
  // these whenever the lead form's question set changes (confirmed again
  // when this sheet moved to a new tab with a completely different question
  // order/set), and for name/phone/username specifically we additionally
  // classify by what the value LOOKS like (pickPhone/pickUsername/pickName),
  // since even the header-labeled slot isn't fully reliable.
  const colIndex = (name: string) => header.findIndex((h) => h.trim() === name)
  const colIndexStartsWith = (prefix: string) => header.findIndex((h) => h.trim().toLowerCase().startsWith(prefix))
  const idx = {
    fullName: colIndex("full_name"),
    phone: colIndex("phone"),
    ismingiz: colIndexStartsWith("ismingiz"),
    telefonRaqam: colIndexStartsWith("telefon_raqam"),
    telegramUsername: colIndexStartsWith("telegram_foydalanuvchi") >= 0 ? colIndexStartsWith("telegram_foydalanuvchi") : colIndexStartsWith("telegram_username"),
    businessField: colIndexStartsWith("qaysi_yo'nalishda_faoliyat") >= 0 ? colIndexStartsWith("qaysi_yo'nalishda_faoliyat") : colIndex("business_field"),
    launchTimeline: colIndexStartsWith("ai_tizimini_biznesingizga_qachon") >= 0 ? colIndexStartsWith("ai_tizimini_biznesingizga_qachon") : colIndexStartsWith("launch_timeline"),
    budget: colIndexStartsWith("loyiha_uchun_qancha_sarmoya"),
    employeesRange: colIndexStartsWith("biznesingizda_nechta_xodim") >= 0 ? colIndexStartsWith("biznesingizda_nechta_xodim") : colIndexStartsWith("employees_range"),
    mainProblem: colIndexStartsWith("ai_yordamida_asosan_qaysi_muammoni"),
    region: colIndexStartsWith("asosiy_faoliyatingiz_qaysi_hududda"),
    decisionRole: colIndexStartsWith("qaror_qabul_qilishdagi_rolingiz") >= 0 ? colIndexStartsWith("qaror_qabul_qilishdagi_rolingiz") : colIndexStartsWith("decision_role"),
  }

  for (const r of dataRows) {
    if (r.length < 12) continue
    const [id, created_time, ad_id, ad_name, adset_id, adset_name, campaign_id, campaign_name, form_id, form_name, is_organic, platform] = r
    const cleanId = (id || "").replace(/^l:/, "").trim()
    if (!cleanId || known.has(cleanId)) continue

    const get = (i: number) => (i >= 0 && i < r.length ? (r[i] ?? "").trim() : "")
    // Name/phone still get value-pattern-guessed (Meta reshuffles those slots
    // unpredictably) — but telegram username now has its own clearly-labeled
    // column in this form version, so read it directly instead of relying on
    // isUsernameLike's "@" heuristic (this form's answer has no "@" prefix).
    const candidates = [get(idx.phone), get(idx.telefonRaqam), get(idx.ismingiz), get(idx.fullName)]
    const phone = pickPhone(candidates)
    const rawUsername = get(idx.telegramUsername)
    const username = rawUsername ? (rawUsername.startsWith("@") ? rawUsername : `@${rawUsername}`) : pickUsername(candidates)
    const fullName = pickName(candidates) || get(idx.fullName) || get(idx.ismingiz)
    if (!fullName || !phone) continue

    const business_field = get(idx.businessField)
    const launch_timeline = get(idx.launchTimeline)
    const budget = get(idx.budget)
    const employees_range = get(idx.employeesRange)
    const main_problem = get(idx.mainProblem)
    const region = get(idx.region)
    const decision_role = get(idx.decisionRole)

    toInsert.push({
      client_name: fullName,
      phone,
      source: platform || null,
      project_type: main_problem || null,
      employees_count: parseEmployeesCount(employees_range || ""),
      budget: budget || null,
      region: region ? region.replace(/_/g, " ").trim() : null,
      sheet_row_ref: cleanId,
      form_data: {
        ad_id, ad_name, form_id, adset_id, form_name, adset_name,
        is_organic, campaign_id, lead_status: "", campaign_name,
        decision_role, business_field, employees_range, launch_timeline,
        main_problem: main_problem || undefined,
        telegram_username: username || undefined,
        created_time_raw: created_time,
      },
    })
    known.add(cleanId)
  }
  }

  if (toInsert.length === 0) {
    return new Response(JSON.stringify({ inserted: 0 }), { headers: JSON_HEADERS })
  }

  const { error } = await supabase.from("leads").insert(toInsert)
  if (error) {
    return new Response(JSON.stringify({ error: error.message, attempted: toInsert.length }), { status: 500, headers: JSON_HEADERS })
  }

  for (const l of toInsert) await announceLead(l)

  return new Response(JSON.stringify({ inserted: toInsert.length, names: toInsert.map((l) => l.client_name) }), { headers: JSON_HEADERS })
})
