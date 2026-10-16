import { Dialog } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { formatDateTime } from "@/lib/utils"
import { restoreDeleted, type FieldHistoryEntry } from "@/lib/history"
import { RotateCcw } from "lucide-react"

export function ArchivePanel({
  open, onOpenChange, items, onRestored, titleOf,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  items: FieldHistoryEntry[]
  onRestored: () => void
  titleOf: (snapshot: Record<string, unknown>) => string
}) {
  async function restore(e: FieldHistoryEntry) {
    const res = await restoreDeleted(e)
    if (!res.ok) {
      alert("Tiklab bo'lmadi: " + res.error)
      return
    }
    onRestored()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Arxiv (o'chirilganlar)">
      <div className="max-h-[60vh] space-y-2 overflow-y-auto">
        {items.map((e) => {
          const snapshot = e.old_value ? (JSON.parse(e.old_value) as Record<string, unknown>) : {}
          return (
            <div
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{titleOf(snapshot)}</div>
                <div className="text-xs text-[var(--color-ink-faint)]">O'chirilgan: {formatDateTime(e.created_at)}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => restore(e)} className="shrink-0">
                <RotateCcw size={13} /> Tiklash
              </Button>
            </div>
          )
        })}
        {items.length === 0 && <p className="py-6 text-center text-xs text-[var(--color-ink-faint)]">Arxiv bo'sh</p>}
      </div>
    </Dialog>
  )
}
