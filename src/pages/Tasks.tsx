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
import { TaskCard, STATUSES, type Task, type ChecklistItem, type ProfileOption } from "@/components/tasks/TaskCard"
import { Plus, X, Tag } from "lucide-react"

const QUADRANTS = [
  { id: 1, title: "Shoshilinch va muhim", tone: "border-t-[var(--color-danger)]" },
  { id: 2, title: "Shoshilinch emas, muhim", tone: "border-t-[var(--color-accent)]" },
  { id: 3, title: "Shoshilinch, muhim emas", tone: "border-t-[var(--color-warning)]" },
  { id: 4, title: "Na shoshilinch, na muhim", tone: "border-t-[var(--color-ink-faint)]" },
]

function Quadrant({ q, count, children }: { q: (typeof QUADRANTS)[number]; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: q.id })
  return (
    <div ref={setNodeRef} className={`w-full shrink-0 rounded-[var(--radius-lg)] border-t-4 md:w-[260px] ${q.tone} bg-[var(--color-surface-2)]/40 p-3 transition-colors ${isOver ? "bg-[var(--color-accent-soft)]" : ""}`}>
      <h3 className="mb-3 text-xs font-semibold text-[var(--color-ink-soft)]">{q.title} <span className="text-[var(--color-ink-faint)]">({count})</span></h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

export default function Tasks() {
  const { session } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [scope, setScope] = useState<"barcha" | "mening">("barcha")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [form, setForm] = useState({ title: "", description: "", department: "", deadline: "", eisenhower: "2", assignee_id: "", status: "yangi", tags: "" })
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
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
    setForm({ title: "", description: "", department: "", deadline: "", eisenhower: "2", assignee_id: "", status: "yangi", tags: "" })
    setChecklistItems([])
    setOpen(true)
  }
  function openEdit(t: Task) {
    setEditing(t)
    setForm({
      title: t.title, description: t.description ?? "", department: t.department ?? "", deadline: t.deadline ?? "",
      eisenhower: String(t.eisenhower), assignee_id: t.assignee_id ?? "", status: t.status, tags: (t.tags ?? []).join(", "),
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
    const payload = {
      title: form.title,
      description: form.description || null,
      department: form.department || null,
      deadline: form.deadline || null,
      eisenhower: Number(form.eisenhower),
      assignee_id: form.assignee_id || null,
      status: form.status,
      tags,
      checklist,
      progress,
    }
    if (editing) {
      await supabase.from("tasks").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("tasks").insert(payload)
    }
    setOpen(false)
    load()
  }

  async function remove(t: Task) {
    if (!confirm(`"${t.title}" vazifasini o'chirishni tasdiqlaysizmi?`)) return
    await supabase.from("tasks").delete().eq("id", t.id)
    load()
  }

  async function toggleItem(task: Task, index: number) {
    const checklist = task.checklist.map((c, i) => (i === index ? { ...c, done: !c.done } : c))
    const progress = checklist.length ? Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100) : 0
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, checklist, progress } : t)))
    await supabase.from("tasks").update({ checklist, progress }).eq("id", task.id)
  }

  async function toggleTimer(task: Task) {
    if (task.timer_started_at) {
      const delta = Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000)
      const time_spent_seconds = task.time_spent_seconds + delta
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, time_spent_seconds, timer_started_at: null } : t)))
      await supabase.from("tasks").update({ time_spent_seconds, timer_started_at: null }).eq("id", task.id)
    } else {
      const timer_started_at = new Date().toISOString()
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, timer_started_at } : t)))
      await supabase.from("tasks").update({ timer_started_at }).eq("id", task.id)
    }
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const newQuadrant = Number(over.id)
    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.eisenhower === newQuadrant) return
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, eisenhower: newQuadrant } : t)))
    await supabase.from("tasks").update({ eisenhower: newQuadrant }).eq("id", task.id)
  }

  const visibleTasks = scope === "mening" ? tasks.filter((t) => t.assignee_id === session?.user.id) : tasks

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Vazifalar</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Eyzenxauer matritsasi — sudrab ustuvorlikni o'zgartiring</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={scope} onChange={setScope} options={[{ value: "barcha", label: "Barcha vazifalar" }, { value: "mening", label: "Mening vazifalarim" }]} />
          <Button variant="accent" onClick={openNew}>
            <Plus size={15} /> Yangi vazifa
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex flex-col gap-3.5 md:flex-row md:overflow-x-auto md:pb-4">
          {QUADRANTS.map((q) => (
            <Quadrant key={q.id} q={q} count={visibleTasks.filter((t) => t.eisenhower === q.id).length}>
              {visibleTasks.filter((t) => t.eisenhower === q.id).map((task) => (
                <motion.div key={task.id} layout>
                  <TaskCard
                    task={task}
                    assignee={profiles.find((p) => p.id === task.assignee_id) ?? null}
                    onEdit={() => openEdit(task)}
                    onDelete={() => remove(task)}
                    onToggle={(i) => toggleItem(task, i)}
                    onToggleTimer={() => toggleTimer(task)}
                  />
                </motion.div>
              ))}
            </Quadrant>
          ))}
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
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div>
              <Label>Muddat</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mas'ul xodim</Label>
              <Select value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}>
                <option value="">Tanlanmagan</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </Select>
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
    </div>
  )
}
