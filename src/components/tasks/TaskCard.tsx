import { useDraggable } from "@dnd-kit/core"
import { Badge } from "@/components/ui/Badge"
import { Checkbox } from "@/components/ui/Checkbox"
import { Progress } from "@/components/ui/Progress"
import { Avatar } from "@/components/ui/Avatar"
import { formatDate } from "@/lib/utils"
import { Pencil, Trash2, CalendarClock, Play, Square } from "lucide-react"

export const STATUSES = [
  { key: "yangi", label: "Yangi" },
  { key: "jarayonda", label: "Jarayonda" },
  { key: "tekshiruvda", label: "Tekshiruvda" },
  { key: "bajarildi", label: "Bajarildi" },
]

export type ChecklistItem = { text: string; done: boolean }
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
  status: string
  tags: string[]
  time_spent_seconds: number
  timer_started_at: string | null
}
export type ProfileOption = { id: string; full_name: string; avatar_url: string | null }

export function isOverdue(deadline: string | null) {
  if (!deadline) return false
  return new Date(deadline).getTime() < Date.now()
}

export function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}s ${m}d`
  return `${m}d`
}

export function TaskCard({ task, assignee, onEdit, onDelete, onToggle, onToggleTimer, draggable = true }: {
  task: Task; assignee: ProfileOption | null; onEdit: () => void
  onDelete?: () => void; onToggle?: (i: number) => void; onToggleTimer?: () => void; draggable?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const style = draggable && transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 } : undefined
  const overdue = isOverdue(task.deadline) && task.progress < 100
  const running = !!task.timer_started_at
  const liveSeconds = task.time_spent_seconds + (running ? Math.floor((Date.now() - new Date(task.timer_started_at!).getTime()) / 1000) : 0)
  const dragProps = draggable ? { ...listeners, ...attributes } : {}
  return (
    <div ref={draggable ? setNodeRef : undefined} style={style} className={isDragging ? "opacity-50" : ""}>
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-[var(--shadow-soft)]">
        {task.checklist?.length > 0 && <Progress value={task.progress} tone={task.progress === 100 ? "success" : "accent"} className="mb-2.5" />}
        <div className="flex items-start justify-between gap-2">
          <div {...dragProps} className={`flex-1 text-[15px] font-semibold leading-snug ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}>{task.title}</div>
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
            <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-ink-soft)]">{task.department}</span>
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
              </label>
            ))}
          </div>
        )}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          {onToggleTimer ? (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleTimer() }}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${running ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]" : "bg-[var(--color-surface-2)] text-[var(--color-ink-soft)]"}`}
            >
              {running ? <Square size={10} /> : <Play size={10} />} {formatElapsed(liveSeconds)}
            </button>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-ink-soft)]">
              {formatElapsed(liveSeconds)}
            </span>
          )}
          {assignee && (
            <div className="flex items-center gap-1.5">
              <Avatar name={assignee.full_name} src={assignee.avatar_url} size={20} />
              <span className="text-xs text-[var(--color-ink-soft)]">{assignee.full_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
