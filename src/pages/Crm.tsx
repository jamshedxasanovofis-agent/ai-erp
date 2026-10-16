import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { Input, Label, Textarea, Select } from "@/components/ui/Input"
import { Tabs } from "@/components/ui/Tabs"
import { FilterBar, type FilterSpec } from "@/components/ui/FilterBar"
import { searchClients, normalizePhoneDigits, type ClientMatch } from "@/lib/crmSearch"
import { REGIONS, FUNNELS, LANGUAGES, BUSINESS_TYPES } from "@/lib/crmConstants"
import { LeadFormDialog } from "@/components/crm/LeadFormDialog"
import { LeadReminderDialog } from "@/components/crm/LeadReminderDialog"
import type { Lead, ProfileOption } from "@/lib/crmTypes"
import { formatDate, formatDateTime, formatUzPhone } from "@/lib/utils"
import { useDragScroll, DRAG_SCROLL_CLASS } from "@/lib/useDragScroll"
import {
  Plus, ChevronRight, Sheet, XCircle, RotateCcw, Code2, Clock, Link2, Check, CalendarCheck,
  Phone, Send, Briefcase, Hourglass, BellRing,
} from "lucide-react"

function formatElapsedLead(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days} kun ${hours} soat ${minutes} daq`
  if (hours > 0) return `${hours} soat ${minutes} daq`
  return `${minutes} daq`
}

function LeadAgeBadge({ submittedAt, closedAt }: { submittedAt: string | null; closedAt: string | null }) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (closedAt || !submittedAt) return
    const id = setInterval(() => tick((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [submittedAt, closedAt])
  if (!submittedAt) return null
  const end = closedAt ? new Date(closedAt).getTime() : Date.now()
  const elapsed = end - new Date(submittedAt).getTime()
  if (elapsed < 0) return null
  return (
    <span
      title={closedAt ? "Sotuv yopilgunga qadar ketgan vaqt" : "Lid tushganidan beri o'tgan vaqt"}
      className={`flex items-center gap-0.5 rounded-md px-1 text-[11px] font-medium ${closedAt ? "text-[var(--color-ink-faint)]" : "text-[var(--color-accent)]"}`}
    >
      <Hourglass size={11} /> {formatElapsedLead(elapsed)}
    </span>
  )
}

const STAGES = [
  { key: "potensial_mijoz", label: "Potensial mijoz" },
  { key: "boglanib_bolmadi", label: "Bog'lanib bo'lmadi" },
  { key: "lead", label: "Lead" },
  { key: "birinchi_uchrashuv", label: "Birinchi uchrashuv" },
  { key: "qayta_aloqa", label: "Qayta aloqa" },
  { key: "kp_berish", label: "KP berish" },
  { key: "etirozlar", label: "E'tirozlar bilan ishlash" },
  { key: "ikkinchi_uchrashuv", label: "Ikkinchi uchrashuv" },
  { key: "demo_berish", label: "Demo versiya berish" },
  { key: "remarketing", label: "1-2 oy ichida rejalashtirmoqda" },
  { key: "gamxorlik", label: "Gamxo'rlik" },
  { key: "yutildi", label: "Buyurtma olindi" },
] as const

const PIPELINE_STAGES = [
  { key: "qimmat", label: "Qimmat" },
  { key: "qiziqdi", label: "Faqat qiziqdi" },
  { key: "qaror_qabul_qiluvchi_emas", label: "Qaror qabul qiluvchi emas" },
  { key: "sifatsiz_lid", label: "Sifatsiz lid" },
  { key: "dublt", label: "Dubl" },
  { key: "chatbot", label: "Chat-bot" },
  { key: "telefon_kotarmadi", label: "Telefonni ko'tarmadi" },
  { key: "byudjeti_yoq", label: "Byudjeti yo'q" },
  { key: "reja_1_2_oy", label: "1-2 oylik rejada" },
  { key: "kurs", label: "Kurs" },
  { key: "arxiv", label: "Arxiv" },
  { key: "boshqa", label: "Boshqa" },
] as const

function StageColumn({ stageKey, children, fixedWidth }: { stageKey: string; children: React.ReactNode; fixedWidth?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: stageKey })
  return (
    <div
      ref={setNodeRef}
      className={`min-w-0 rounded-[var(--radius-md)] transition-colors ${fixedWidth ? "w-[248px] shrink-0" : ""} ${isOver ? "bg-[var(--color-accent-soft)]" : ""}`}
    >
      {children}
    </div>
  )
}

function DraggableLead({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 } : undefined
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} data-dnd-card className={isDragging ? "opacity-50" : ""}>
      {children}
    </div>
  )
}

export default function Crm() {
  const boardScroll = useDragScroll<HTMLDivElement>()
  const [view, setView] = useState<"voronka" | "pipeline">("voronka")
  const [funnel, setFunnel] = useState<"marketing" | "call_center">("call_center")
  const [leads, setLeads] = useState<Lead[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetUrl, setSheetUrl] = useState("")
  const [apiInfoOpen, setApiInfoOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<Lead | null>(null)
  const [rejectReason, setRejectReason] = useState<(typeof PIPELINE_STAGES)[number]["key"]>("qimmat")
  const [rejectNote, setRejectNote] = useState("")
  const [search, setSearch] = useState("")
  const [regionFilter, setRegionFilter] = useState("")
  const [clientMatches, setClientMatches] = useState<ClientMatch[]>([])
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null)
  const [meetingCounts, setMeetingCounts] = useState<Record<string, number>>({})
  const [reminderLeadIds, setReminderLeadIds] = useState<Set<string>>(new Set())
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [stageFilter, setStageFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [reminderLead, setReminderLead] = useState<Lead | null>(null)
  const navigate = useNavigate()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function copyBookingLink(lead: Lead) {
    if (!lead.booking_token) return
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/booking/lead/${lead.booking_token}`)
    setCopiedLeadId(lead.id)
    setTimeout(() => setCopiedLeadId((id) => (id === lead.id ? null : id)), 1500)
  }

  async function load() {
    const [{ data }, { data: pr }, { data: mtg }, { data: rem }] = await Promise.all([
      supabase.from("leads").select("*").order("submitted_at", { ascending: false, nullsFirst: false }),
      supabase.from("profiles").select("id, full_name"),
      supabase.from("meetings").select("lead_id").eq("status", "otkazildi"),
      supabase.from("lead_reminders").select("lead_id").is("done_at", null).is("notified_at", null),
    ])
    const fetchedLeads = (data as Lead[]) ?? []
    // Self-heal: leads already closed (won/lost) BEFORE the time-in-pipeline
    // freeze existed have no closed_at, so their age badge would otherwise
    // count up forever. Stamp them once, from now, so they stop growing.
    const legacyClosed = fetchedLeads.filter((l) => (l.stage === "yutildi" || l.stage === "yoqotildi") && !l.closed_at)
    if (legacyClosed.length) {
      const now = new Date().toISOString()
      legacyClosed.forEach((l) => { l.closed_at = now })
      Promise.all(legacyClosed.map((l) => supabase.from("leads").update({ closed_at: now }).eq("id", l.id)))
    }
    setLeads(fetchedLeads)
    setProfiles((pr as ProfileOption[]) ?? [])
    const counts: Record<string, number> = {}
    for (const m of (mtg as { lead_id: string | null }[]) ?? []) {
      if (!m.lead_id) continue
      counts[m.lead_id] = (counts[m.lead_id] ?? 0) + 1
    }
    setMeetingCounts(counts)
    setReminderLeadIds(new Set((rem as { lead_id: string }[] ?? []).map((r) => r.lead_id)))
  }
  useEffect(() => {
    load()
  }, [])

  function openNew() {
    setEditing(null)
    setOpen(true)
  }
  function openEdit(lead: Lead) {
    setEditing(lead)
    setOpen(true)
  }

  // "Buyurtma olindi" freezes the lead's time-in-pipeline counter; leaving it
  // (moved backward, or the loss flow below) un-freezes it again.
  function closedAtForStage(stageKey: string): string | null {
    return stageKey === "yutildi" ? new Date().toISOString() : null
  }

  async function moveStage(lead: Lead, dir: 1 | -1) {
    const idx = STAGES.findIndex((s) => s.key === lead.stage)
    const next = STAGES[Math.min(STAGES.length - 1, Math.max(0, idx + dir))]
    const closed_at = closedAtForStage(next.key)
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, stage: next.key, closed_at } : l)))
    await supabase.from("leads").update({ stage: next.key, closed_at }).eq("id", lead.id)
  }

  async function onLeadDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const newStage = String(over.id)
    const lead = leads.find((l) => l.id === active.id)
    if (!lead || lead.stage === newStage) return
    const closed_at = closedAtForStage(newStage)
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, stage: newStage, closed_at } : l)))
    await supabase.from("leads").update({ stage: newStage, closed_at }).eq("id", lead.id)
  }

  async function onPipelineDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const newStage = String(over.id)
    const lead = leads.find((l) => l.id === active.id)
    if (!lead || lead.pipeline_stage === newStage) return
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, pipeline_stage: newStage } : l)))
    await supabase.from("leads").update({ pipeline_stage: newStage }).eq("id", lead.id)
  }

  function openReject(lead: Lead) {
    setRejectTarget(lead)
    setRejectReason("qimmat")
    setRejectNote("")
  }
  async function confirmReject(e: React.FormEvent) {
    e.preventDefault()
    if (!rejectTarget) return
    await supabase.from("leads").update({
      stage: "yoqotildi",
      pipeline_stage: rejectReason,
      rejection_note: rejectNote || null,
      closed_at: new Date().toISOString(),
    }).eq("id", rejectTarget.id)
    setRejectTarget(null)
    load()
  }

  async function restore(lead: Lead) {
    await supabase.from("leads").update({ stage: "potensial_mijoz", pipeline_stage: null, rejection_note: null, closed_at: null }).eq("id", lead.id)
    load()
  }

  async function importFromSheet(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch(sheetUrl)
    const text = await res.text()
    const rows = text.trim().split("\n").map((r) => r.split(","))
    const [header, ...body] = rows
    const idx = (name: string) => header.findIndex((h) => h.trim().toLowerCase().includes(name))
    const iName = idx("ism") >= 0 ? idx("ism") : idx("name")
    const iCompany = idx("company") >= 0 ? idx("company") : idx("kompaniya")
    const iAmount = idx("amount") >= 0 ? idx("amount") : idx("summa")
    const iPhone = idx("phone") >= 0 ? idx("phone") : idx("telefon")
    const payload = body
      .filter((r) => r[iName]?.trim())
      .map((r, i) => ({
        client_name: r[iName]?.trim() ?? "Noma'lum",
        company: iCompany >= 0 ? r[iCompany]?.trim() : null,
        phone: iPhone >= 0 ? r[iPhone]?.trim() : null,
        amount: iAmount >= 0 ? Number(r[iAmount]?.replace(/[^\d.]/g, "")) || null : null,
        stage: "potensial_mijoz",
        sheet_row_ref: `${sheetUrl}#${i}`,
      }))
    if (payload.length) {
      await supabase.from("leads").upsert(payload, { onConflict: "sheet_row_ref", ignoreDuplicates: true })
    }
    setSheetOpen(false)
    load()
  }

  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) {
      setClientMatches([])
      return
    }
    const t = setTimeout(() => {
      searchClients(q).then(setClientMatches)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  function leadMatchesQuery(l: Lead, q: string, qDigits: string) {
    if (q && l.client_name.toLowerCase().includes(q)) return true
    if (qDigits.length >= 3 && normalizePhoneDigits(l.phone ?? "").includes(qDigits)) return true
    return false
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const qDigits = normalizePhoneDigits(search)
    const from = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null
    const to = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null
    return leads.filter((l) => {
      if (regionFilter && l.region !== regionFilter) return false
      if (stageFilter && l.stage !== stageFilter) return false
      if (categoryFilter && l.business_type !== categoryFilter) return false
      if (from || to) {
        const t = l.submitted_at ? new Date(l.submitted_at).getTime() : null
        if (t == null) return false
        if (from && t < from) return false
        if (to && t > to) return false
      }
      if (!q) return true
      return leadMatchesQuery(l, q, qDigits)
    })
  }, [leads, search, regionFilter, stageFilter, categoryFilter, dateFrom, dateTo])

  const voronkaLeads = filtered.filter((l) => l.stage !== "yoqotildi" && l.funnel === funnel)
  const pipelineLeads = filtered.filter((l) => l.stage === "yoqotildi")

  const globalLeadMatches = useMemo(() => {
    const q = search.trim().toLowerCase()
    const qDigits = normalizePhoneDigits(search)
    if (q.length < 2 && qDigits.length < 3) return []
    const visibleIds = new Set((view === "voronka" ? voronkaLeads : pipelineLeads).map((l) => l.id))
    return leads
      .filter((l) => !visibleIds.has(l.id) && leadMatchesQuery(l, q, qDigits))
      .slice(0, 8)
  }, [leads, search, view, voronkaLeads, pipelineLeads])

  const filterSpecs: FilterSpec[] = [
    { key: "region", label: "Barcha viloyatlar", value: regionFilter, options: REGIONS.map((r) => ({ value: r, label: r })), onChange: setRegionFilter },
    { key: "stage", label: "Barcha bosqichlar", value: stageFilter, options: STAGES.map((s) => ({ value: s.key, label: s.label })), onChange: setStageFilter },
    { key: "category", label: "Barcha biznes turlari", value: categoryFilter, options: BUSINESS_TYPES.map((b) => ({ value: b.key, label: b.label })), onChange: setCategoryFilter },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">CRM</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Sotuv voronkasi va rad etilgan lidlar pipeline'i</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setApiInfoOpen(true)}>
            <Code2 size={15} /> API orqali ulash
          </Button>
          <Button variant="outline" onClick={() => setSheetOpen(true)}>
            <Sheet size={15} /> Sheets'dan import
          </Button>
          <Button variant="accent" onClick={openNew}>
            <Plus size={15} /> Yangi lid
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={view} onChange={setView} options={[{ value: "voronka", label: "Voronka" }, { value: "pipeline", label: "Birja lidov" }]} />
          {view === "voronka" && <Tabs value={funnel} onChange={setFunnel} options={FUNNELS} />}
        </div>
        <div className="text-xs font-medium text-[var(--color-ink-soft)]">
          Jami: <span className="text-[var(--color-ink)]">{(view === "voronka" ? voronkaLeads : pipelineLeads).length}</span> ta lid
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Ism yoki telefon..." filters={filterSpecs} className="flex-1" />
        <div className="flex items-center gap-1.5">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" title="Sana (dan)" />
          <span className="text-xs text-[var(--color-ink-faint)]">—</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" title="Sana (gacha)" />
        </div>
      </div>

      {search.trim().length >= 2 && (globalLeadMatches.length > 0 || clientMatches.length > 0) && (
        <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="text-xs font-medium text-[var(--color-ink-soft)]">Boshqa joylardan topildi</div>
          {globalLeadMatches.map((l) => (
            <div
              key={l.id}
              onClick={() => openEdit(l)}
              className="flex cursor-pointer items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border)] p-2.5 text-sm hover:bg-[var(--color-surface-2)]"
            >
              <div>
                <span className="font-medium">{l.client_name}</span>
                {l.phone && <span className="ml-2 text-xs text-[var(--color-ink-faint)]">{formatUzPhone(l.phone)}</span>}
              </div>
              <Badge tone="accent">
                {l.stage === "yoqotildi" ? "Birja lidov" : STAGES.find((s) => s.key === l.stage)?.label ?? l.stage}
              </Badge>
            </div>
          ))}
          {clientMatches.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate("/mijozlar")}
              className="flex cursor-pointer items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border)] p-2.5 text-sm hover:bg-[var(--color-surface-2)]"
            >
              <div>
                <span className="font-medium">{c.name}</span>
                {c.phone && <span className="ml-2 text-xs text-[var(--color-ink-faint)]">{formatUzPhone(c.phone)}</span>}
              </div>
              <Badge tone="success">Mijoz</Badge>
            </div>
          ))}
        </div>
      )}

      {view === "voronka" && (
        <DndContext sensors={sensors} onDragEnd={onLeadDragEnd}>
          <div ref={boardScroll.ref} {...boardScroll.dragScrollProps} className={`flex gap-3.5 overflow-x-auto pb-2 ${DRAG_SCROLL_CLASS}`}>
            {STAGES.map((stage) => {
              const items = voronkaLeads.filter((l) => l.stage === stage.key)
              return (
                <StageColumn key={stage.key} stageKey={stage.key} fixedWidth>
                  <div className="mb-2.5 flex items-center justify-between px-1">
                    <span className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--color-ink-soft)]">{stage.label}</span>
                    <span className="text-xs text-[var(--color-ink-faint)]">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {items.map((lead) => (
                        <motion.div
                          key={lead.id}
                          layout
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.94 }}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        >
                          <DraggableLead id={lead.id}>
                            <Card className="cursor-grab rounded-[var(--radius-md)] p-3.5 active:cursor-grabbing" onClick={() => openEdit(lead)}>
                              {(lead.temperature || lead.source) && (
                                <div className="mb-2 flex flex-wrap gap-1">
                                  {lead.temperature && (
                                    <span className={`h-1.5 w-9 rounded-full ${
                                      lead.temperature === "issiq" ? "bg-[var(--color-danger)]" :
                                      lead.temperature === "iliq" ? "bg-[var(--color-warning)]" : "bg-[var(--color-accent)]"
                                    }`} />
                                  )}
                                  {lead.source && <span className="h-1.5 w-9 rounded-full bg-[var(--color-success)]" />}
                                </div>
                              )}
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-[13.5px] font-semibold leading-snug">{lead.client_name}</div>
                                <button
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => { e.stopPropagation(); openReject(lead) }}
                                  title="Rad etish"
                                  className="cursor-pointer rounded p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
                                >
                                  <XCircle size={13} />
                                </button>
                              </div>
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {lead.language && <Badge tone="neutral">{LANGUAGES.find((l) => l.key === lead.language)?.label}</Badge>}
                                {lead.region && <Badge tone="neutral">{lead.region}</Badge>}
                                {lead.tier && <Badge tone="accent">Tier {lead.tier}</Badge>}
                              </div>
                              {!!(lead.phone || lead.form_data?.telegram_username || lead.business_type || lead.form_data?.launch_timeline) && (
                                <div className="mt-1.5 space-y-0.5 text-[11px] text-[var(--color-ink-soft)]">
                                  {lead.phone && (
                                    <div className="flex items-center gap-1"><Phone size={10} /> {formatUzPhone(lead.phone)}</div>
                                  )}
                                  {typeof lead.form_data?.telegram_username === "string" && lead.form_data.telegram_username && (
                                    <div className="flex items-center gap-1"><Send size={10} /> {String(lead.form_data.telegram_username)}</div>
                                  )}
                                  {lead.business_type && (
                                    <div className="flex items-center gap-1"><Briefcase size={10} /> {BUSINESS_TYPES.find((b) => b.key === lead.business_type)?.label ?? lead.business_type}</div>
                                  )}
                                  {typeof lead.form_data?.launch_timeline === "string" && lead.form_data.launch_timeline && (
                                    <div className="flex items-center gap-1"><Hourglass size={10} /> {String(lead.form_data.launch_timeline).replace(/_/g, " ")}</div>
                                  )}
                                </div>
                              )}
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-faint)]">
                                  <span className="flex items-center gap-1">
                                    <Clock size={11} />
                                    {lead.deadline ? formatDate(lead.deadline) : lead.submitted_at ? formatDateTime(lead.submitted_at) : "—"}
                                  </span>
                                  <LeadAgeBadge submittedAt={lead.submitted_at} closedAt={lead.closed_at} />
                                </div>
                                <div className="flex items-center gap-0.5">
                                  {meetingCounts[lead.id] > 0 && (
                                    <span
                                      title="O'tkazilgan uchrashuvlar"
                                      className="flex items-center gap-0.5 rounded-md px-1 text-[11px] font-medium text-[var(--color-ink-faint)]"
                                    >
                                      <CalendarCheck size={12} /> {meetingCounts[lead.id]}
                                    </span>
                                  )}
                                  <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); setReminderLead(lead) }}
                                    title={reminderLeadIds.has(lead.id) ? "Eslatma qo'yilgan" : "Eslatma qo'yish"}
                                    className={`cursor-pointer rounded-md p-1 hover:bg-[var(--color-accent-soft)] ${
                                      reminderLeadIds.has(lead.id)
                                        ? "text-[var(--color-success)] hover:text-[var(--color-success)]"
                                        : "text-[var(--color-ink-faint)] hover:text-[var(--color-accent)]"
                                    }`}
                                  >
                                    <BellRing size={13} fill={reminderLeadIds.has(lead.id) ? "currentColor" : "none"} />
                                  </button>
                                  <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); copyBookingLink(lead) }}
                                    title="Bron havolasini nusxalash"
                                    className="cursor-pointer rounded-md p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                                  >
                                    {copiedLeadId === lead.id ? <Check size={13} className="text-[var(--color-success)]" /> : <Link2 size={13} />}
                                  </button>
                                  <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); moveStage(lead, -1) }}
                                    className="cursor-pointer rounded-md p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-surface-2)] disabled:opacity-20"
                                    disabled={stage.key === STAGES[0].key}
                                  >
                                    <ChevronRight size={13} className="rotate-180" />
                                  </button>
                                  <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); moveStage(lead, 1) }}
                                    className="cursor-pointer rounded-md p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-surface-2)] disabled:opacity-20"
                                    disabled={stage.key === STAGES[STAGES.length - 1].key}
                                  >
                                    <ChevronRight size={13} />
                                  </button>
                                </div>
                              </div>
                            </Card>
                          </DraggableLead>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </StageColumn>
              )
            })}
          </div>
        </DndContext>
      )}

      {view === "pipeline" && (
        <DndContext sensors={sensors} onDragEnd={onPipelineDragEnd}>
          <div ref={boardScroll.ref} {...boardScroll.dragScrollProps} className={`flex gap-3.5 overflow-x-auto pb-2 ${DRAG_SCROLL_CLASS}`}>
            {PIPELINE_STAGES.map((stage) => {
              const items = pipelineLeads.filter((l) => l.pipeline_stage === stage.key)
              return (
                <StageColumn key={stage.key} stageKey={stage.key} fixedWidth>
                  <div className="mb-2.5 flex items-center justify-between px-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">{stage.label}</span>
                    <span className="text-xs text-[var(--color-ink-faint)]">{items.length}</span>
                  </div>
                  <div className="space-y-2.5">
                    {items.map((lead) => (
                      <DraggableLead key={lead.id} id={lead.id}>
                        <Card className="cursor-grab p-3.5 active:cursor-grabbing">
                          <div className="text-sm font-medium">{lead.client_name}</div>
                          {lead.company && <div className="text-xs text-[var(--color-ink-soft)]">{lead.company}</div>}
                          {lead.rejection_note && <p className="mt-1.5 text-xs text-[var(--color-ink-faint)]">{lead.rejection_note}</p>}
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); restore(lead) }}
                            className="mt-2.5 flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline"
                          >
                            <RotateCcw size={12} /> Qayta tiklash
                          </button>
                        </Card>
                      </DraggableLead>
                    ))}
                    {items.length === 0 && <p className="text-xs text-[var(--color-ink-faint)]">Bo'sh</p>}
                  </div>
                </StageColumn>
              )
            })}
          </div>
        </DndContext>
      )}

      <LeadFormDialog
        open={open}
        onOpenChange={setOpen}
        lead={editing}
        profiles={profiles}
        defaultFunnel={funnel}
        onSaved={load}
      />

      <LeadReminderDialog
        open={!!reminderLead}
        onOpenChange={(v) => { if (!v) { setReminderLead(null); load() } }}
        leadId={reminderLead?.id ?? null}
        leadName={reminderLead?.client_name ?? ""}
        profiles={profiles}
      />

      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)} title="Nega yo'qotildik?">
        <form onSubmit={confirmReject} className="space-y-3">
          <div>
            <Label>Sabab</Label>
            <Select value={rejectReason} onChange={(e) => setRejectReason(e.target.value as typeof rejectReason)}>
              {PIPELINE_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Izoh {rejectReason === "boshqa" && "(majburiy)"}</Label>
            <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} required={rejectReason === "boshqa"} />
          </div>
          <Button type="submit" variant="danger" className="w-full">Pipeline'ga o'tkazish</Button>
        </form>
      </Dialog>

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen} title="Google Sheets'dan lidlarni import qilish">
        <form onSubmit={importFromSheet} className="space-y-3">
          <div>
            <Label>Sheet CSV havolasi (File → Share → Publish to web → CSV)</Label>
            <Textarea value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/.../pub?output=csv" required />
          </div>
          <Button type="submit" variant="accent" className="w-full">Import qilish</Button>
        </form>
      </Dialog>

      <Dialog open={apiInfoOpen} onOpenChange={setApiInfoOpen} title="API orqali lid qo'shish">
        <div className="space-y-3 text-sm">
          <p className="text-[var(--color-ink-soft)]">
            Google Apps Script, Zapier, Make yoki boshqa avtomatlashtirish orqali quyidagi so'rovni yuboring:
          </p>
          <pre className="overflow-x-auto rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] p-3 text-xs leading-relaxed">
{`POST ${import.meta.env.VITE_SUPABASE_URL}/rest/v1/leads
apikey: <VITE_SUPABASE_ANON_KEY>
Authorization: Bearer <VITE_SUPABASE_ANON_KEY>
Content-Type: application/json
Prefer: return=minimal

{
  "client_name": "Aziz Karimov",
  "phone": "+998901234567",
  "company": "Example LLC",
  "employees_count": 12,
  "budget": "5,000,000 so'm",
  "form_data": { "manba": "Landing forma" }
}`}
          </pre>
          <p className="text-xs text-[var(--color-ink-faint)]">
            Google Apps Script'da <code>UrlFetchApp.fetch(url, {"{"}method:"post", headers:{"{"}...{"}"}, payload: JSON.stringify(data){"}"}</code> orqali chaqiring.
          </p>
        </div>
      </Dialog>

    </div>
  )
}
