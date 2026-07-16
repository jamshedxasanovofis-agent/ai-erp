import { useEffect, useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import { Bell, CheckCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { formatDate } from "@/lib/utils"
import type { Notification } from "@/lib/types"

export function NotificationCenter() {
  const { session } = useAuth()
  const [items, setItems] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  async function load() {
    if (!session) return
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(30)
    setItems((data as Notification[]) ?? [])
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id])

  const unread = items.filter((n) => !n.read_at)

  async function markRead(n: Notification) {
    if (n.read_at) return
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)))
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id)
  }

  async function markAllRead() {
    const ids = unread.map((n) => n.id)
    if (!ids.length) return
    const now = new Date().toISOString()
    setItems((prev) => prev.map((i) => (i.read_at ? i : { ...i, read_at: now })))
    await supabase.from("notifications").update({ read_at: now }).in("id", ids)
  }

  if (!session) return null

  return (
    <div>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]">
            <Bell size={16} />
            {unread.length > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[9px] font-bold text-white">
                {unread.length > 9 ? "9+" : unread.length}
              </span>
            )}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={10}
            className="z-50 w-80 max-w-[92vw] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">Bildirishnomalar</span>
              {unread.length > 0 && (
                <button onClick={markAllRead} className="flex cursor-pointer items-center gap-1 text-[11px] text-[var(--color-accent)] hover:underline">
                  <CheckCheck size={12} /> Barchasini o'qilgan
                </button>
              )}
            </div>
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={`block w-full cursor-pointer rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-xs transition-colors hover:bg-[var(--color-surface-2)] ${
                    !n.read_at ? "bg-[var(--color-accent-soft)]" : ""
                  }`}
                >
                  <div className="font-medium text-[var(--color-ink)]">{n.title}</div>
                  {n.body && <div className="mt-0.5 text-[var(--color-ink-soft)]">{n.body}</div>}
                  <div className="mt-1 text-[10px] text-[var(--color-ink-faint)]">{formatDate(n.created_at)}</div>
                </button>
              ))}
              {items.length === 0 && <p className="px-2.5 py-4 text-center text-xs text-[var(--color-ink-faint)]">Bildirishnomalar yo'q</p>}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
