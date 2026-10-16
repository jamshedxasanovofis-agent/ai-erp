import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { DndContext, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input, Label, Select } from "@/components/ui/Input"
import { Tabs } from "@/components/ui/Tabs"
import { Comments } from "@/components/ui/Comments"
import { TaskCard, type Task } from "@/components/tasks/TaskCard"
import { LeadFormDialog } from "@/components/crm/LeadFormDialog"
import type { Lead } from "@/lib/crmTypes"
import { formatMoney, formatDate } from "@/lib/utils"
import { deleteWithArchive, fetchDeletionHistory, type FieldHistoryEntry } from "@/lib/history"
import { ArchivePanel } from "@/components/ui/ArchivePanel"
import { MultiAssigneeSelect } from "@/components/ui/MultiAssigneeSelect"
import { Columns3, FolderKanban, Wallet, Contact, CalendarClock, FileWarning, Plus, Copy, Check, Trash2, User, Archive, Video, MapPin } from "lucide-react"

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
}

type OverdueTask = { id: string; title: string; deadline: string; assignee_id: string | null; assignee_ids: string[] | null }
function overdueTaskAssigneeIds(t: OverdueTask): string[] {
  return t.assignee_ids?.length ? t.assignee_ids : t.assignee_id ? [t.assignee_id] : []
}
type Meeting = {
  id: string; scheduled_at: string; status: string; lead_id: string | null; client_photo_url: string | null
  booking_token: string; guest_name: string | null; format: string | null; assignee_id: string | null; assignee_ids: string[] | null
  leads?: { client_name: string } | null
}
type ProfileOption = { id: string; full_name: string; avatar_url: string | null }
type LeadOption = { id: string; client_name: string; phone: string | null }

const STATUS_LABEL: Record<string, string> = { yangi: "Yangi", jarayonda: "Jarayonda" }

const OY_NOMLARI = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"]
function formatMeetingDateTime(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
  return `${d.getDate()}-${OY_NOMLARI[d.getMonth()]}, ${time}`
}

function TaskStatusColumn({ status, children }: { status: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div ref={setNodeRef} className={`rounded-[var(--radius-md)] transition-colors ${isOver ? "bg-[var(--color-accent-soft)]" : ""}`}>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const { session } = useAuth()
  const [stats, setStats] = useState({ leads: 0, projects: 0, income: 0, clients: 0, meetingsToday: 0, openTz: 0 })
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([])
  const [feedTasks, setFeedTasks] = useState<Task[]>([])
  const navigate = useNavigate()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [taskScope, setTaskScope] = useState<"barcha" | "mening">("barcha")
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [meetingFilter, setMeetingFilter] = useState<"bugun" | "ertaga" | "indinga" | "barchasi">("bugun")
  const [meetingFormatFilter, setMeetingFormatFilter] = useState<"" | "onlayn" | "oflayn">("")
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [leadQuery, setLeadQuery] = useState("")
  const [leadResults, setLeadResults] = useState<LeadOption[]>([])
  const [meetingForm, setMeetingForm] = useState({ lead_id: "", guest_name: "", assignee_ids: [] as string[], date: "", time: "10:00", format: "oflayn" })
  const [bookingLink, setBookingLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [editForm, setEditForm] = useState({ date: "", time: "", status: "kutilmoqda", format: "oflayn", assignee_ids: [] as string[] })
  const [viewingLead, setViewingLead] = useState<Lead | null>(null)
  const [leadDialogOpen, setLeadDialogOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [deletedMeetings, setDeletedMeetings] = useState<FieldHistoryEntry[]>([])

  async function load() {
    const now = new Date()
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
    const [leads, projects, income, clients, meetingsToday, tz, overdue, feed, mtg, pr] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "jarayonda"),
      supabase.from("finance_transactions").select("amount").eq("type", "kirim"),
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase.from("meetings").select("id", { count: "exact", head: true }).gte("scheduled_at", todayStart.toISOString()).lte("scheduled_at", todayEnd.toISOString()),
      supabase.from("projects").select("id", { count: "exact", head: true }).not("tz_file_url", "is", null),
      supabase.from("tasks").select("id, title, deadline, assignee_id, assignee_ids").lt("deadline", now.toISOString()).neq("status", "bajarildi"),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(40),
      supabase.from("meetings").select("*, leads(client_name)").order("scheduled_at", { ascending: true }),
      supabase.from("profiles").select("id, full_name, avatar_url"),
    ])
    setStats({
      leads: leads.count ?? 0,
      projects: projects.count ?? 0,
      income: (income.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0),
      clients: clients.count ?? 0,
      meetingsToday: meetingsToday.count ?? 0,
      openTz: tz.count ?? 0,
    })
    setOverdueTasks((overdue.data as OverdueTask[]) ?? [])
    setFeedTasks((feed.data as Task[]) ?? [])
    setMeetings((mtg.data as Meeting[]) ?? [])
    setProfiles((pr.data as ProfileOption[]) ?? [])
    notifyOverdue((overdue.data as OverdueTask[]) ?? [])
  }

  async function notifyOverdue(tasks: OverdueTask[]) {
    for (const t of tasks) {
      const ids = overdueTaskAssigneeIds(t)
      if (!ids.length) continue
      const { data: existing } = await supabase
        .from("notifications")
        .select("id, recipient_id")
        .eq("type", "overdue_task")
        .eq("entity_id", t.id)
        .is("read_at", null)
      const alreadyNotified = new Set((existing ?? []).map((n) => n.recipient_id))
      for (const recipientId of ids) {
        if (alreadyNotified.has(recipientId)) continue
        await supabase.from("notifications").insert({
          type: "overdue_task",
          entity_type: "task",
          entity_id: t.id,
          recipient_id: recipientId,
          title: "Vazifa muddati o'tdi",
          body: t.title,
        })
      }
    }
  }
  useEffect(() => {
    load()
  }, [])

  const cards = [
    { label: "Ochiq lidlar", value: stats.leads, icon: Columns3 },
    { label: "Jarayondagi loyihalar", value: stats.projects, icon: FolderKanban },
    { label: "Jami kirim", value: formatMoney(stats.income), icon: Wallet },
    { label: "Mijozlar bazasi", value: stats.clients, icon: Contact },
    { label: "Bugungi uchrashuvlar", value: stats.meetingsToday, icon: CalendarClock },
    { label: "Ochiq TZ", value: stats.openTz, icon: FileWarning },
  ]

  const visibleTasks = taskScope === "mening"
    ? feedTasks.filter((t) => !!session && (t.assignee_ids?.length ? t.assignee_ids : t.assignee_id ? [t.assignee_id] : []).includes(session.user.id))
    : feedTasks
  const tasksByStatus = useMemo(() => {
    const groups: Record<string, Task[]> = { yangi: [], jarayonda: [] }
    for (const t of visibleTasks) {
      if (t.status === "tekshiruvda" || t.status === "bajarildi") continue
      (groups[t.status] ??= []).push(t)
    }
    return groups
  }, [visibleTasks])

  // Nearest-upcoming-first: future meetings ascending (soonest at top), then
  // past ones (most-recently-past first) below them — plain ascending sort
  // by date alone would put stale June meetings above an upcoming Aug 3
  // meeting, which reads as broken.
  function sortByUpcomingFirst(list: Meeting[]) {
    const now = Date.now()
    return [...list].sort((a, b) => {
      const ta = new Date(a.scheduled_at).getTime()
      const tb = new Date(b.scheduled_at).getTime()
      const aFuture = ta >= now
      const bFuture = tb >= now
      if (aFuture !== bFuture) return aFuture ? -1 : 1
      return aFuture ? ta - tb : tb - ta
    })
  }

  const filteredMeetings = useMemo(() => {
    const now = new Date()
    const dayKey = (d: Date) => d.toDateString()
    const today = dayKey(now)
    const tomorrow = dayKey(new Date(now.getTime() + 86400000))
    const dayAfter = dayKey(new Date(now.getTime() + 2 * 86400000))
    let list = meetings
    if (meetingFilter !== "barchasi") {
      list = list.filter((m) => {
        const k = dayKey(new Date(m.scheduled_at))
        if (meetingFilter === "bugun") return k === today
        if (meetingFilter === "ertaga") return k === tomorrow
        return k === dayAfter
      })
    }
    if (meetingFormatFilter) list = list.filter((m) => (m.format ?? "oflayn") === meetingFormatFilter)
    return sortByUpcomingFirst(list)
  }, [meetings, meetingFilter, meetingFormatFilter])

  async function searchLeads() {
    if (!leadQuery.trim()) return
    const { data } = await supabase.from("leads").select("id, client_name, phone").ilike("client_name", `%${leadQuery.trim()}%`).limit(6)
    setLeadResults((data as LeadOption[]) ?? [])
  }

  async function createMeeting(e: React.FormEvent) {
    e.preventDefault()
    if (!meetingForm.date) return
    const scheduled_at = new Date(`${meetingForm.date}T${meetingForm.time}:00`).toISOString()
    const { data } = await supabase.from("meetings").insert({
      lead_id: meetingForm.lead_id || null,
      guest_name: meetingForm.lead_id ? null : meetingForm.guest_name || null,
      assignee_id: meetingForm.assignee_ids[0] ?? null,
      assignee_ids: meetingForm.assignee_ids,
      scheduled_at,
      status: "tasdiqlangan",
      format: meetingForm.format,
    }).select("id, booking_token").single()
    if (data) {
      setBookingLink(`${window.location.origin}${window.location.pathname}#/booking/${data.booking_token}`)
      supabase.functions.invoke("meeting-notify", { body: { meeting_id: data.id, event: "created" } })
    }
    load()
  }

  function closeMeetingDialog() {
    setMeetingOpen(false)
    setBookingLink(null)
    setCopied(false)
    setMeetingForm({ lead_id: "", guest_name: "", assignee_ids: [], date: "", time: "10:00", format: "oflayn" })
    setLeadQuery("")
    setLeadResults([])
  }

  function openMeetingEdit(m: Meeting) {
    const d = new Date(m.scheduled_at)
    setEditForm({
      date: d.toISOString().slice(0, 10),
      time: d.toTimeString().slice(0, 5),
      status: m.status,
      format: m.format ?? "oflayn",
      assignee_ids: m.assignee_ids?.length ? m.assignee_ids : m.assignee_id ? [m.assignee_id] : [],
    })
    setEditingMeeting(m)
  }

  async function saveMeetingEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMeeting) return
    const scheduled_at = new Date(`${editForm.date}T${editForm.time}:00`).toISOString()
    await supabase.from("meetings").update({
      scheduled_at, status: editForm.status, format: editForm.format,
      assignee_id: editForm.assignee_ids[0] ?? null, assignee_ids: editForm.assignee_ids,
    }).eq("id", editingMeeting.id)
    setEditingMeeting(null)
    load()
  }

  async function deleteMeeting() {
    if (!editingMeeting) return
    if (!confirm("Uchrashuvni o'chirishni tasdiqlaysizmi?")) return
    const res = await deleteWithArchive("meetings", "meeting", editingMeeting.id, editingMeeting)
    if (!res.ok) {
      alert("O'chirib bo'lmadi: " + res.error)
      return
    }
    setEditingMeeting(null)
    load()
  }

  async function openArchive() {
    setDeletedMeetings(await fetchDeletionHistory("meeting"))
    setArchiveOpen(true)
  }

  async function openLeadFromMeeting() {
    if (!editingMeeting?.lead_id) return
    const { data } = await supabase.from("leads").select("*").eq("id", editingMeeting.lead_id).single()
    if (!data) return
    setEditingMeeting(null)
    setViewingLead(data as Lead)
    setLeadDialogOpen(true)
  }

  const completedMeetings = useMemo(() => {
    return meetings
      .filter((m) => m.status === "otkazildi")
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
      .slice(0, 20)
  }, [meetings])

  async function onTaskDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const newStatus = String(over.id)
    const task = feedTasks.find((t) => t.id === active.id)
    if (!task || task.status === newStatus) return
    setFeedTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)))
    await supabase.from("tasks").update({ status: newStatus }).eq("id", task.id)
  }

  return (
    <div className="space-y-6">
      <motion.div
        {...fade}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 divide-x divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0"
      >
        {cards.map((c) => (
          <div key={c.label} className="p-6">
            <div className="mb-4 text-[11.5px] font-medium uppercase tracking-[0.07em] text-[var(--color-ink-faint)]">{c.label}</div>
            <div className="font-[family-name:var(--font-display)] text-[27px] font-semibold tracking-tight tabular-nums">{c.value}</div>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Uchrashuvlar</CardTitle>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={openArchive}>
                <Archive size={13} /> Arxiv
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMeetingOpen(true)}>
                <Plus size={13} /> Yangi uchrashuv
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Tabs
                value={meetingFilter}
                onChange={setMeetingFilter}
                options={[
                  { value: "bugun", label: "Bugun" },
                  { value: "ertaga", label: "Ertaga" },
                  { value: "indinga", label: "Indinga" },
                  { value: "barchasi", label: "Barchasi" },
                ]}
              />
              <Select value={meetingFormatFilter} onChange={(e) => setMeetingFormatFilter(e.target.value as typeof meetingFormatFilter)} className="w-auto min-w-[130px]">
                <option value="">Barcha turlar</option>
                <option value="onlayn">Onlayn</option>
                <option value="oflayn">Oflayn</option>
              </Select>
            </div>
            <div className="space-y-2">
              {filteredMeetings.map((m) => (
                <div
                  key={m.id}
                  onClick={() => openMeetingEdit(m)}
                  className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--color-surface-2)]"
                >
                  {m.client_photo_url ? (
                    <img src={m.client_photo_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-xs text-[var(--color-ink-faint)]">?</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{m.leads?.client_name ?? m.guest_name ?? "Lid biriktirilmagan"}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-soft)]">
                      {formatMeetingDateTime(m.scheduled_at)}
                      <span className="flex items-center gap-0.5 text-xs font-normal text-[var(--color-ink-faint)]">
                        {(m.format ?? "oflayn") === "onlayn" ? <Video size={11} /> : <MapPin size={11} />}
                        {(m.format ?? "oflayn") === "onlayn" ? "Onlayn" : "Oflayn"}
                      </span>
                    </div>
                  </div>
                  <Badge tone={m.status === "tasdiqlangan" ? "success" : m.status === "bekor_qilingan" ? "danger" : m.status === "otkazildi" ? "accent" : "neutral"}>
                    {m.status === "tasdiqlangan" ? "Tasdiqlangan" : m.status === "bekor_qilingan" ? "Bekor qilingan" : m.status === "otkazildi" ? "O'tkazildi" : "Kutilmoqda"}
                  </Badge>
                </div>
              ))}
              {filteredMeetings.length === 0 && <p className="text-xs text-[var(--color-ink-faint)]">Uchrashuvlar yo'q</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-[var(--color-danger)]">Muddati o'tgan vazifalar</CardTitle></CardHeader>
          <CardContent className="space-y-2 pt-0">
            {overdueTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
                <span className="truncate">{t.title}</span>
                <span className="shrink-0 text-xs">{formatDate(t.deadline)}</span>
              </div>
            ))}
            {overdueTasks.length === 0 && <p className="text-xs text-[var(--color-ink-faint)]">Muddati o'tgan vazifalar yo'q 🎉</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Uchrashuvlar tarixi</CardTitle></CardHeader>
        <CardContent className="space-y-2 pt-0">
          {completedMeetings.map((m) => (
            <div
              key={m.id}
              onClick={() => openMeetingEdit(m)}
              className="flex cursor-pointer items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-surface-2)]"
            >
              <span className="truncate font-medium">{m.leads?.client_name ?? m.guest_name ?? "Lid biriktirilmagan"}</span>
              <span className="shrink-0 text-xs text-[var(--color-ink-faint)]">{formatMeetingDateTime(m.scheduled_at)}</span>
            </div>
          ))}
          {completedMeetings.length === 0 && <p className="text-xs text-[var(--color-ink-faint)]">Hali o'tkazilgan uchrashuvlar yo'q</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vazifalar lentasi</CardTitle>
          <Tabs value={taskScope} onChange={setTaskScope} options={[{ value: "barcha", label: "Jamoa vazifalari" }, { value: "mening", label: "Mening vazifalarim" }]} />
        </CardHeader>
        <CardContent className="pt-0">
          <DndContext sensors={sensors} onDragEnd={onTaskDragEnd}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Object.entries(tasksByStatus).map(([status, list]) => (
                <TaskStatusColumn key={status} status={status}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">{STATUS_LABEL[status]}</span>
                    <span className="text-xs text-[var(--color-ink-faint)]">{list.length}</span>
                  </div>
                  <div className="space-y-2">
                    {list.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        assignees={profiles.filter((p) => (t.assignee_ids?.length ? t.assignee_ids : t.assignee_id ? [t.assignee_id] : []).includes(p.id))}
                        onEdit={() => navigate("/vazifalar")}
                      />
                    ))}
                    {list.length === 0 && <p className="text-xs text-[var(--color-ink-faint)]">Bo'sh</p>}
                  </div>
                </TaskStatusColumn>
              ))}
            </div>
          </DndContext>
        </CardContent>
      </Card>

      <Dialog open={meetingOpen} onOpenChange={(v) => (v ? setMeetingOpen(true) : closeMeetingDialog())} title="Yangi uchrashuv">
        {!bookingLink ? (
          <form onSubmit={createMeeting} className="space-y-3">
            <div>
              <Label>Lid (ixtiyoriy)</Label>
              <div className="flex gap-2">
                <Input value={leadQuery} onChange={(e) => setLeadQuery(e.target.value)} placeholder="Mijoz ismi..." />
                <Button type="button" variant="outline" onClick={searchLeads}>Qidirish</Button>
              </div>
              <div className="mt-2 space-y-1.5">
                {leadResults.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => { setMeetingForm((f) => ({ ...f, lead_id: l.id })); setLeadQuery(l.client_name); setLeadResults([]) }}
                    className={`block w-full cursor-pointer rounded-[var(--radius-sm)] border px-3 py-2 text-left text-sm ${meetingForm.lead_id === l.id ? "border-[var(--color-accent)]" : "border-[var(--color-border)]"}`}
                  >
                    {l.client_name} {l.phone ? `· ${l.phone}` : ""}
                  </button>
                ))}
              </div>
              {meetingForm.lead_id && (
                <button
                  type="button"
                  onClick={() => { setMeetingForm((f) => ({ ...f, lead_id: "" })); setLeadQuery("") }}
                  className="mt-1.5 cursor-pointer text-xs text-[var(--color-danger)]"
                >
                  Lidni bekor qilish
                </button>
              )}
            </div>
            {!meetingForm.lead_id && (
              <div>
                <Label>Mijoz ismi (lid biriktirilmagan bo'lsa)</Label>
                <Input
                  value={meetingForm.guest_name}
                  onChange={(e) => setMeetingForm({ ...meetingForm, guest_name: e.target.value })}
                  placeholder="Masalan: Bexruz aka"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sana</Label>
                <Input type="date" value={meetingForm.date} onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })} required />
              </div>
              <div>
                <Label>Vaqt</Label>
                <Input type="time" value={meetingForm.time} onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mas'ul xodimlar</Label>
                <MultiAssigneeSelect value={meetingForm.assignee_ids} onChange={(ids) => setMeetingForm({ ...meetingForm, assignee_ids: ids })} profiles={profiles} />
              </div>
              <div>
                <Label>Turi</Label>
                <Select value={meetingForm.format} onChange={(e) => setMeetingForm({ ...meetingForm, format: e.target.value })}>
                  <option value="oflayn">Oflayn</option>
                  <option value="onlayn">Onlayn</option>
                </Select>
              </div>
            </div>
            <Button type="submit" variant="accent" className="w-full" disabled={!meetingForm.date}>Qo'shish</Button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-ink-soft)]">Uchrashuv yaratildi. Quyidagi havolani mijozga yuboring — u o'ziga qulay vaqtni tanlaydi:</p>
            <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs">
              <span className="flex-1 truncate">{bookingLink}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(bookingLink); setCopied(true) }}
                className="shrink-0 cursor-pointer text-[var(--color-accent)]"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <Button variant="outline" className="w-full" onClick={closeMeetingDialog}>Yopish</Button>
          </div>
        )}
      </Dialog>

      <Dialog open={!!editingMeeting} onOpenChange={(v) => !v && setEditingMeeting(null)} title="Uchrashuvni boshqarish">
        {editingMeeting && (
          <form onSubmit={saveMeetingEdit} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">
                {editingMeeting.leads?.client_name ?? editingMeeting.guest_name ?? "Lid biriktirilmagan"}
              </div>
              {editingMeeting.lead_id && (
                <button
                  type="button"
                  onClick={openLeadFromMeeting}
                  className="flex cursor-pointer items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline"
                >
                  <User size={12} /> Lidni ko'rish
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sana</Label>
                <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} required />
              </div>
              <div>
                <Label>Vaqt</Label>
                <Input type="time" value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Holati</Label>
                <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="kutilmoqda">Kutilmoqda</option>
                  <option value="tasdiqlangan">Tasdiqlangan</option>
                  <option value="bekor_qilingan">Bekor qilingan</option>
                  <option value="otkazildi">O'tkazildi (bo'lib o'tdi)</option>
                </Select>
              </div>
              <div>
                <Label>Turi</Label>
                <Select value={editForm.format} onChange={(e) => setEditForm({ ...editForm, format: e.target.value })}>
                  <option value="oflayn">Oflayn</option>
                  <option value="onlayn">Onlayn</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>Mas'ul xodimlar</Label>
              <MultiAssigneeSelect value={editForm.assignee_ids} onChange={(ids) => setEditForm({ ...editForm, assignee_ids: ids })} profiles={profiles} />
            </div>
            {editForm.status === "otkazildi" && <Comments entityType="meeting" entityId={editingMeeting.id} />}
            <div className="flex gap-2">
              <Button type="submit" variant="accent" className="flex-1">Saqlash</Button>
              <Button type="button" variant="danger" onClick={deleteMeeting}><Trash2 size={14} /></Button>
            </div>
          </form>
        )}
      </Dialog>

      <LeadFormDialog
        open={leadDialogOpen}
        onOpenChange={setLeadDialogOpen}
        lead={viewingLead}
        profiles={profiles}
        onSaved={load}
      />

      <ArchivePanel
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        items={deletedMeetings}
        onRestored={() => { openArchive(); load() }}
        titleOf={(s) => String(s.guest_name ?? "Uchrashuv")}
      />
    </div>
  )
}
