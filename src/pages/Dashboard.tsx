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
import { Columns3, FolderKanban, Wallet, Contact, CalendarClock, FileWarning, Plus, Copy, Check, Trash2, User } from "lucide-react"

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
}

type OverdueTask = { id: string; title: string; deadline: string; assignee_id: string | null }
type Meeting = {
  id: string; scheduled_at: string; status: string; lead_id: string | null; client_photo_url: string | null
  booking_token: string; guest_name: string | null; leads?: { client_name: string } | null
}
type ProfileOption = { id: string; full_name: string; avatar_url: string | null }
type LeadOption = { id: string; client_name: string; phone: string | null }

const STATUS_LABEL: Record<string, string> = { yangi: "Yangi", jarayonda: "Jarayonda", bajarildi: "Bajarildi" }

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
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [leadQuery, setLeadQuery] = useState("")
  const [leadResults, setLeadResults] = useState<LeadOption[]>([])
  const [meetingForm, setMeetingForm] = useState({ lead_id: "", guest_name: "", assignee_id: "", date: "", time: "10:00" })
  const [bookingLink, setBookingLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [editForm, setEditForm] = useState({ date: "", time: "", status: "kutilmoqda" })
  const [viewingLead, setViewingLead] = useState<Lead | null>(null)
  const [leadDialogOpen, setLeadDialogOpen] = useState(false)

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
      supabase.from("tasks").select("id, title, deadline, assignee_id").lt("deadline", now.toISOString()).neq("status", "bajarildi"),
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
      if (!t.assignee_id) continue
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("type", "overdue_task")
        .eq("entity_id", t.id)
        .is("read_at", null)
        .maybeSingle()
      if (existing) continue
      await supabase.from("notifications").insert({
        type: "overdue_task",
        entity_type: "task",
        entity_id: t.id,
        recipient_id: t.assignee_id,
        title: "Vazifa muddati o'tdi",
        body: t.title,
      })
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

  const visibleTasks = taskScope === "mening" ? feedTasks.filter((t) => t.assignee_id === session?.user.id) : feedTasks
  const tasksByStatus = useMemo(() => {
    const groups: Record<string, Task[]> = { yangi: [], jarayonda: [], bajarildi: [] }
    for (const t of visibleTasks) {
      if (t.status === "tekshiruvda") continue
      (groups[t.status] ??= []).push(t)
    }
    return groups
  }, [visibleTasks])

  const filteredMeetings = useMemo(() => {
    const now = new Date()
    const dayKey = (d: Date) => d.toDateString()
    const today = dayKey(now)
    const tomorrow = dayKey(new Date(now.getTime() + 86400000))
    const dayAfter = dayKey(new Date(now.getTime() + 2 * 86400000))
    if (meetingFilter === "barchasi") return meetings
    return meetings.filter((m) => {
      const k = dayKey(new Date(m.scheduled_at))
      if (meetingFilter === "bugun") return k === today
      if (meetingFilter === "ertaga") return k === tomorrow
      return k === dayAfter
    })
  }, [meetings, meetingFilter])

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
      assignee_id: meetingForm.assignee_id || null,
      scheduled_at,
      status: "tasdiqlangan",
    }).select("booking_token").single()
    if (data) {
      setBookingLink(`${window.location.origin}${window.location.pathname}#/booking/${data.booking_token}`)
    }
    load()
  }

  function closeMeetingDialog() {
    setMeetingOpen(false)
    setBookingLink(null)
    setCopied(false)
    setMeetingForm({ lead_id: "", guest_name: "", assignee_id: "", date: "", time: "10:00" })
    setLeadQuery("")
    setLeadResults([])
  }

  function openMeetingEdit(m: Meeting) {
    const d = new Date(m.scheduled_at)
    setEditForm({
      date: d.toISOString().slice(0, 10),
      time: d.toTimeString().slice(0, 5),
      status: m.status,
    })
    setEditingMeeting(m)
  }

  async function saveMeetingEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMeeting) return
    const scheduled_at = new Date(`${editForm.date}T${editForm.time}:00`).toISOString()
    await supabase.from("meetings").update({ scheduled_at, status: editForm.status }).eq("id", editingMeeting.id)
    setEditingMeeting(null)
    load()
  }

  async function deleteMeeting() {
    if (!editingMeeting) return
    if (!confirm("Uchrashuvni o'chirishni tasdiqlaysizmi?")) return
    await supabase.from("meetings").delete().eq("id", editingMeeting.id)
    setEditingMeeting(null)
    load()
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
            <Button size="sm" variant="outline" onClick={() => setMeetingOpen(true)}>
              <Plus size={13} /> Yangi uchrashuv
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
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
                    <div className="mt-0.5 text-sm font-medium text-[var(--color-ink-soft)]">
                      {formatMeetingDateTime(m.scheduled_at)}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                        assignee={profiles.find((p) => p.id === t.assignee_id) ?? null}
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
            <div>
              <Label>Mas'ul xodim</Label>
              <Select value={meetingForm.assignee_id} onChange={(e) => setMeetingForm({ ...meetingForm, assignee_id: e.target.value })}>
                <option value="">Tanlanmagan</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </Select>
            </div>
            <Button type="submit" variant="accent" className="w-full" disabled={!meetingForm.date}>Yaratish</Button>
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
            <div>
              <Label>Holati</Label>
              <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="kutilmoqda">Kutilmoqda</option>
                <option value="tasdiqlangan">Tasdiqlangan</option>
                <option value="bekor_qilingan">Bekor qilingan</option>
                <option value="otkazildi">O'tkazildi (bo'lib o'tdi)</option>
              </Select>
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
    </div>
  )
}
