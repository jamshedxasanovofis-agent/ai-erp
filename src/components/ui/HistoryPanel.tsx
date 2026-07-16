import { useEffect, useState } from "react"
import { Dialog } from "@/components/ui/Dialog"
import { fetchFieldHistory, type FieldHistoryEntry } from "@/lib/history"
import { formatDateTime } from "@/lib/utils"
import { History } from "lucide-react"

export function HistoryButton({ entityType, entityId, label = "Tarix" }: { entityType: string; entityId: string; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
      >
        <History size={13} /> {label}
      </button>
      <HistoryDialog entityType={entityType} entityId={entityId} open={open} onOpenChange={setOpen} />
    </>
  )
}

export function HistoryDialog({
  entityType, entityId, open, onOpenChange,
}: {
  entityType: string
  entityId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [entries, setEntries] = useState<FieldHistoryEntry[]>([])

  useEffect(() => {
    if (!open) return
    fetchFieldHistory(entityType, entityId).then(setEntries)
  }, [open, entityType, entityId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="O'zgarishlar tarixi">
      <div className="space-y-2">
        {entries.map((e) => (
          <div key={e.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm">
            {e.field_key === "__deleted__" ? (
              <div className="text-[var(--color-danger)] font-medium">O'chirildi</div>
            ) : (
              <div>
                <span className="font-medium">{e.field_label}</span> o'zgartirildi:{" "}
                <span className="text-[var(--color-danger)] line-through">{e.old_value ?? "—"}</span>
                {" → "}
                <span className="text-[var(--color-success)] font-medium">{e.new_value ?? "—"}</span>
              </div>
            )}
            <div className="mt-0.5 text-xs text-[var(--color-ink-faint)]">{formatDateTime(e.created_at)}</div>
          </div>
        ))}
        {entries.length === 0 && <p className="text-xs text-[var(--color-ink-faint)]">Hozircha o'zgarishlar tarixi yo'q.</p>}
      </div>
    </Dialog>
  )
}
