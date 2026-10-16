import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Textarea } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { formatDateTime } from "@/lib/utils"
import { MessageSquare } from "lucide-react"

type Comment = { id: string; body: string; author_name: string | null; created_at: string }

export function Comments({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [items, setItems] = useState<Comment[]>([])
  const [text, setText] = useState("")

  async function load() {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: true })
    setItems((data as Comment[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [entityType, entityId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    await supabase.from("comments").insert({ entity_type: entityType, entity_id: entityId, body: text.trim() })
    setText("")
    load()
  }

  return (
    <div className="mt-2">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
        <MessageSquare size={13} /> Kommentariyalar
      </div>
      <div className="mb-2 max-h-40 space-y-2 overflow-y-auto">
        {items.map((c) => (
          <div key={c.id} className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-3 py-2 text-xs">
            <div className="mb-0.5 flex items-center justify-between text-[10px] text-[var(--color-ink-faint)]">
              <span>{c.author_name}</span>
              <span>{formatDateTime(c.created_at)}</span>
            </div>
            <div className="text-[var(--color-ink)]">{c.body}</div>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-[var(--color-ink-faint)]">Hozircha kommentariya yo‘q.</p>}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Izoh yozing..." className="min-h-16 flex-1" />
        <Button type="submit" variant="outline" size="sm" className="self-end">Yuborish</Button>
      </form>
    </div>
  )
}
