import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  DndContext, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input, Label, Textarea, Select } from "@/components/ui/Input"
import { Comments } from "@/components/ui/Comments"
import { Tabs } from "@/components/ui/Tabs"
import { ArchivePanel } from "@/components/ui/ArchivePanel"
import { deleteWithArchive, fetchDeletionHistory, type FieldHistoryEntry } from "@/lib/history"
import { TaskCard, STATUSES, DEPARTMENTS, type Task, type ChecklistItem, type ProfileOption } from "@/components/tasks/TaskCard"
import { MultiAssigneeSelect } from "@/components/ui/MultiAssigneeSelect"
import { useDragScroll, DRAG_SCROLL_CLASS } from "@/lib/useDragScroll"
import { Plus, X, Tag, Archive } from "lucide-react"

function timerStopFields(t: { time_spent_seconds: number; timer_started_at: string | null }) {
  if (!t.timer_started_at) return {}
  const delta = Math.floor((Date.now() - new Date(t.timer_started_at).getTime()) / 1000)
  return { time_spent_seconds: t.time_spent_seconds + delta, timer_started_at: null as string | null }
}
function timerStartFields() {
  return { timer_started_at: new Date().toISOString() }
}
function taskAssigneeIds(t: Task): string[] {
  return t.assignee_ids?.length ? t.assignee_ids : t.assignee_id ? [t.assignee_id] : []
}

const QUADRANTS = [
  { id: 1, title: "Shoshilinch va muhim", tone: "border-t-[var(--color-danger)]" },
  { id: 2, title: "Shoshilinch emas, muhim", tone: "border-t-[var(--color-accent)]" },
  { id: 3, title: "Shoshilinch, muhim emas", tone: "border-t-[var(--color-warning)]" },
  { id: 4, title: "Na shoshilinch, na muhim", tone: "border-t-[var(--color-ink-faint)]" },
]
const DONE_COLUMN = { id: "done" as const, title: "Bajarilgan", tone: "border-t-[var(--color-success)]" }

function Quadrant({ id, title, tone, count, children }: { id: number | "done"; title: string; tone: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`w-full shrink-0 rounded-[var(--radius-lg)] border-t-4 md:w-[260px] ${tone} bg-[var(--color-surface-2)]/40 p-3 transition-colors ${isOver ? "bg-[var(--color-accent-soft)]" : ""}`}>
      <h3 className="mb-3 text-xs font-semibold text-[var(--color-ink-soft)]">{title} <span className="text-[var(--color-ink-faint)]">({count})</span></h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

export default function Tasks() {
  const boardScroll = useDragScroll<HTMLDivElement>()
  const { session } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [scope, setScope] = useState<"barcha" | "mening">("barcha")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [form, setForm] = useState({ title: "", description: "", department: "", deadline: "", eisenhower: "2", assignee_ids: [] as string[], status: "yangi", tags: "" })
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [deletedTasks, setDeletedTasks] = useState<FieldHistoryEntry[]>([])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  async function load() {
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, avatar_url"),
    ])
    setTasks((t as Task[]) ?? [])
    setProfiles((p as ProfileOption[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  function openNew() {
    setEditing(null)
    setForm({ title: "", description: "", department: "", deadline: "", eisenhower: "2", assignee_ids: [], status: "yangi", tags: "" })
    setChecklistItems([])
    setOpen(true)
  }
  function openEdit(t: Task) {
    setEditing(t)
    const assigneeIds = t.assignee_ids?.length ? t.assignee_ids : t.assignee_id ? [t.assignee_id] : []
    setForm({
      title: t.title, description: t.description ?? "", department: t.department ?? "", deadline: t.deadline ?? "",
      eisenhower: String(t.eisenhower), assignee_ids: assigneeIds, status: t.status, tags: (t.tags ?? []).join(", "),
    })
    setChecklistItems(t.checklist ?? [])
    setOpen(true)
  }

  function addChecklistRow() {
    setChecklistItems((items) => [...items, { text: "", done: false }])
  }
  function updateChecklistRow(idx: number, text: string) {
    setChecklistItems((items) => items.map((it, i) => (i === idx ? { ...it, text } : it)))
  }
  function removeChecklistRow(idx: number) {
    setChecklistItems((items) => items.filter((_, i) => i !== idx))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const checklist: ChecklistItem[] = checklistItems.filter((c) => c.text.trim())
    const progress = checklist.length ? Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100) : (editing?.progress ?? 0)
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean)
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description || null,
      department: form.department || null,
      deadline: form.deadline || null,
      eisenhower: Number(form.eisenhower),
      assignee_id: form.assignee_ids[0] ?? null,
      assignee_ids: form.assignee_ids,
      status: form.status,
      tags,
      checklist,
      progress,
    }
    if (editing) {
      // Timer auto-runs while a task is open and auto-stops the moment it's
      // marked done (and restarts if it's reopened) — no manual bookkeeping.
      const becameDone = form.status === "bajarildi" && editing.status !== "bajarildi"
      const leftDone = form.status !== "bajarildi" && editing.status === "bajarildi"
      if (becameDone) Object.assign(payload, timerStopFields(editing))
      else if (leftDone) Object.assign(payload, timerStartFields())
      await supabase.from("tasks").update(payload).eq("id", editing.id)
    } else {
      Object.assign(payload, timerStartFields())
      await supabase.from("tasks").insert(payload)
    }
    setOpen(false)
    load()
  }

  async function remove(t: Task) {
    if (!confirm(`"${t.title}" vazifasini o'chirishni tasdiqlaysizmi?`)) return
    const res = await deleteWithArchive("tasks", "task", t.id, t)
    if (!res.ok) {
      alert("O'chirib bo'lmadi: " + res.error)
      return
    }
    load()
  }

  async function openArchive() {
    setDeletedTasks(await fetchDeletionHistory("task"))
    setArchiveOpen(true)
  }

  async function toggleItem(task: Task, index: number) {
    const now = new Date().toISOString()
    const checklist = task.checklist.map((c, i) => (i === index ? { ...c, done: !c.done, completed_at: !c.done ? now : null } : c))
    const progress = checklist.length ? Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100) : 0
    // Checklist fully done → task auto-moves to "Bajarilgan"; unchecking an
    // item on an auto-completed task brings it back out. Timer follows suit.
    let status = task.status
    if (progress === 100) status = "bajarildi"
    else if (task.status === "bajarildi") status = "jarayonda"
    const timerFields =
      status === "bajarildi" && task.status !== "bajarildi" ? timerStopFields(task) :
      task.status === "bajarildi" && status !== "bajarildi" ? timerStartFields() : {}
    const update = { checklist, progress, status, ...timerFields }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...update } : t)))
    await supabase.from("tasks").update(update).eq("id", task.id)
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task) return
    if (over.id === DONE_COLUMN.id) {
      if (task.status === "bajarildi") return
      const update = { status: "bajarildi", ...timerStopFields(task) }
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...update } : t)))
      await supabase.from("tasks").update(update).eq("id", task.id)
      return
    }
    const newQuadrant = Number(over.id)
    const wasDone = task.status === "bajarildi"
    if (task.eisenhower === newQuadrant && !wasDone) return
    const update = wasDone ? { eisenhower: newQuadrant, status: "jarayonda", ...timerStartFields() } : { eisenhower: newQuadrant }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...update } : t)))
    await supabase.from("tasks").update(update).eq("id", task.id)
  }

  const visibleTasks = scope === "mening" ? tasks.filter((t) => !!session && taskAssigneeIds(t).includes(session.user.id)) : tasks

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Vazifalar</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Eyzenxauer matritsasi — sudrab ustuvorlikni o'zgartiring</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={scope} onChange={setScope} options={[{ value: "barcha", label: "Barcha vazifalar" }, { value: "mening", label: "Mening vazifalarim" }]} />
          <Button variant="outline" onClick={openArchive}>
            <Archive size={15} /> Arxiv
          </Button>
          <Button variant="accent" onClick={openNew}>
            <Plus size={15} /> Yangi vazifa
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div ref={boardScroll.ref} {...boardScroll.dragScrollProps} className={`flex flex-col gap-3.5 md:flex-row md:overflow-x-auto md:pb-4 ${DRAG_SCROLL_CLASS}`}>
          {QUADRANTS.map((q) => {
            const items = visibleTasks.filter((t) => t.eisenhower === q.id && t.status !== "bajarildi")
            return (
              <Quadrant key={q.id} id={q.id} title={q.title} tone={q.tone} count={items.length}>
                {items.map((task) => (
                  <motion.div key={task.id} layout>
                    <TaskCard
                      task={task}
                      assignees={profiles.filter((p) => taskAssigneeIds(task).includes(p.id))}
                      onEdit={() => openEdit(task)}
                      onDelete={() => remove(task)}
                      onToggle={(i) => toggleItem(task, i)}
                    />
                  </motion.div>
                ))}
              </Quadrant>
            )
          })}
          {(() => {
            const doneItems = visibleTasks.filter((t) => t.status === "bajarildi")
            return (
              <Quadrant id={DONE_COLUMN.id} title={DONE_COLUMN.title} tone={DONE_COLUMN.tone} count={doneItems.length}>
                {doneItems.map((task) => (
                  <motion.div key={task.id} layout>
                    <TaskCard
                      task={task}
                      assignees={profiles.filter((p) => taskAssigneeIds(task).includes(p.id))}
                      onEdit={() => openEdit(task)}
                      onDelete={() => remove(task)}
                      onToggle={(i) => toggleItem(task, i)}
                    />
                  </motion.div>
                ))}
              </Quadrant>
            )
          })()}
        </div>
      </DndContext>

      <Dialog open={open} onOpenChange={setOpen} title={editing ? "Vazifani tahrirlash" : "Yangi vazifa"}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <Label>Sarlavha</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <Label>Izoh</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bo'lim</Label>
              <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                <option value="">Tanlanmagan</option>
                {DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Muddat</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mas'ul xodimlar</Label>
              <MultiAssigneeSelect value={form.assignee_ids} onChange={(ids) => setForm({ ...form, assignee_ids: ids })} profiles={profiles} />
            </div>
            <div>
              <Label>Eyzenxauer kvadranti</Label>
              <Select value={form.eisenhower} onChange={(e) => setForm({ ...form, eisenhower: e.target.value })}>
                {QUADRANTS.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-1"><Tag size={11} /> Teglar (vergul bilan)</Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="moliya, sotuv" />
            </div>
          </div>
          <div>
            <Label>Check-list</Label>
            <div className="space-y-2">
              {checklistItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={item.text}
                    onChange={(e) => updateChecklistRow(idx, e.target.value)}
                    placeholder={`Qadam ${idx + 1}`}
                    autoFocus={idx === checklistItems.length - 1}
                  />
                  <button
                    type="button"
                    onClick={() => removeChecklistRow(idx)}
                    className="cursor-pointer rounded p-1.5 text-[var(--color-ink-faint)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addChecklistRow}
                className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline"
              >
                <Plus size={13} /> Band qo'shish
              </button>
            </div>
          </div>
          <Button type="submit" variant="accent" className="w-full">{editing ? "Saqlash" : "Qo'shish"}</Button>
        </form>
        {editing && <Comments entityType="task" entityId={editing.id} />}
      </Dialog>

      <ArchivePanel
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        items={deletedTasks}
        onRestored={() => { openArchive(); load() }}
        titleOf={(s) => String(s.title ?? "Vazifa")}
      />
    </div>
  )
}
