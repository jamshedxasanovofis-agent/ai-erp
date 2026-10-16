import { useEffect, useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import { Badge } from "@/components/ui/Badge"
import { Checkbox } from "@/components/ui/Checkbox"
import { Progress } from "@/components/ui/Progress"
import { Avatar } from "@/components/ui/Avatar"
import { formatDate } from "@/lib/utils"
import { Pencil, Trash2, CalendarClock, Play } from "lucide-react"

export const STATUSES = [
  { key: "yangi", label: "Yangi" },
  { key: "jarayonda", label: "Jarayonda" },
  { key: "tekshiruvda", label: "Tekshiruvda" },
  { key: "bajarildi", label: "Bajarildi" },
]

export const DEPARTMENTS = [
  { key: "marketing", label: "Marketing" },
  { key: "moliya", label: "Moliya" },
  { key: "texnik", label: "Texnik" },
]

export type ChecklistItem = { text: string; done: boolean; completed_at?: string | null }
export type Task = {
  id: string
  title: string
  description: string | null
  department: string | null
  deadline: string | null
  checklist: ChecklistItem[]
  progress: number
  eisenhower: number
  assignee_id: string | null
  assignee_ids: string[]
  status: string
  tags: string[]
  time_spent_seconds: number
  timer_started_at: string | null
  started_at: string
}
export type ProfileOption = { id: string; full_name: string; avatar_url: string | null }

export function isOverdue(deadline: string | null) {
  if (!deadline) return false
  return new Date(deadline).getTime() < Date.now()
}

export function formatElapsed(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d} kun ${h} soat`
  if (h > 0) return `${h} soat ${m} daq`
  if (m > 0) return `${m} daq ${sec} son`
  return `${sec} son`
}

// Splits the task's elapsed time across its checklist items, in completion
// order — each item's slice is the time between the previous checkpoint
// (task start, or the prior item's completion) and when it was checked off.
// Keyed by original checklist index (not text) since two items can share a
// label. Returns a Map<index, seconds> for completed items only.
function checklistTimeBreakdown(task: Task): Map<number, number> {
  const result = new Map<number, number>()
  if (!task.checklist?.length) return result
  const startMs = new Date(task.started_at).getTime()
  const done = task.checklist
    .map((item, idx) => ({ item, idx }))
    .filter((x) => x.item.done && x.item.completed_at)
    .sort((a, b) => new Date(a.item.completed_at!).getTime() - new Date(b.item.completed_at!).getTime())
  let cursor = startMs
  for (const { item, idx } of done) {
    const t = new Date(item.completed_at!).getTime()
    result.set(idx, Math.max(0, Math.round((t - cursor) / 1000)))
    cursor = t
  }
  return result
}

export function TaskCard({ task, assignees, onEdit, onDelete, onToggle, draggable = true }: {
  task: Task; assignees: ProfileOption[]; onEdit: () => void
  onDelete?: () => void; onToggle?: (i: number) => void; draggable?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const style = draggable && transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 } : undefined
  const overdue = isOverdue(task.deadline) && task.progress < 100
  const running = !!task.timer_started_at
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [running])
  const liveSeconds = task.time_spent_seconds + (running ? Math.floor((Date.now() - new Date(task.timer_started_at!).getTime()) / 1000) : 0)
  const timeBreakdown = checklistTimeBreakdown(task)
  const dragProps = draggable ? { ...listeners, ...attributes } : {}
  return (
    <div ref={draggable ? setNodeRef : undefined} style={style} className={isDragging ? "opacity-50" : ""}>
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-[var(--shadow-soft)]">
        {task.checklist?.length > 0 && <Progress value={task.progress} tone={task.progress === 100 ? "success" : "accent"} className="mb-2.5" />}
        <div className="flex items-start justify-between gap-2">
          <div {...dragProps} data-dnd-card={draggable ? true : undefined} className={`flex-1 text-[15px] font-semibold leading-snug ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}>{task.title}</div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            <button onClick={onEdit} className="cursor-pointer rounded p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"><Pencil size={12} /></button>
            {onDelete && (
              <button onClick={onDelete} className="cursor-pointer rounded p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"><Trash2 size={12} /></button>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{STATUSES.find((s) => s.key === task.status)?.label ?? task.status}</Badge>
          {task.department && (
            <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-ink-soft)]">
              {DEPARTMENTS.find((d) => d.key === task.department)?.label ?? task.department}
            </span>
          )}
          {task.deadline && (
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${overdue ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]" : "bg-[var(--color-surface-2)] text-[var(--color-ink-soft)]"}`}>
              <CalendarClock size={10} /> {formatDate(task.deadline)}
            </span>
          )}
        </div>
        {task.tags?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {task.tags.map((t) => <Badge key={t} tone="accent">{t}</Badge>)}
          </div>
        )}
        {task.checklist?.length > 0 && (
          <div className="mt-2.5 space-y-1.5">
            {task.checklist.map((item, idx) => (
              <label key={idx} className={`flex items-center gap-2 text-xs ${onToggle ? "cursor-pointer" : ""}`}>
                <Checkbox checked={item.done} onCheckedChange={() => onToggle?.(idx)} />
                <span className={item.done ? "text-[var(--color-ink-faint)] line-through" : ""}>{item.text}</span>
                {item.done && timeBreakdown.has(idx) && (
                  <span className="ml-auto shrink-0 text-[10px] text-[var(--color-ink-faint)]">
                    {formatElapsed(timeBreakdown.get(idx)!)}
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span
            title="Vazifa ustida ishlangan vaqt — avtomatik hisoblanadi"
            className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${running ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "bg-[var(--color-surface-2)] text-[var(--color-ink-soft)]"}`}
          >
            {running && <Play size={9} />} {formatElapsed(liveSeconds)}
          </span>
          {assignees.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {assignees.slice(0, 3).map((a) => (
                  <Avatar key={a.id} name={a.full_name} src={a.avatar_url} size={20} className="ring-2 ring-[var(--color-surface)]" />
                ))}
              </div>
              <span className="text-xs text-[var(--color-ink-soft)]">
                {assignees.length === 1 ? assignees[0].full_name : `${assignees.length} kishi`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
