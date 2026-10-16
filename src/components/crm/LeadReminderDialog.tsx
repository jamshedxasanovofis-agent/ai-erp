import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Dialog } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input, Label, Select } from "@/components/ui/Input"
import { REMINDER_KINDS } from "@/lib/crmConstants"
import { formatDateTime } from "@/lib/utils"
import { Trash2 } from "lucide-react"

type ProfileOption = { id: string; full_name: string }
type Reminder = {
  id: string; lead_id: string; assignee_id: string | null; remind_at: string
  kind: string; note: string | null; done_at: string | null
}

export function LeadReminderDialog({
  open, onOpenChange, leadId, leadName, profiles,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  leadId: string | null
  leadName: string
  profiles: ProfileOption[]
}) {
  const [items, setItems] = useState<Reminder[]>([])
  const [form, setForm] = useState({ assignee_id: "", date: "", time: "10:00", kind: "call_back", note: "" })

  async function load() {
    if (!leadId) return
    const { data } = await supabase.from("lead_reminders").select("*").eq("lead_id", leadId).is("done_at", null).order("remind_at", { ascending: true })
    setItems((data as Reminder[]) ?? [])
  }
  useEffect(() => {
    if (open) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leadId])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!leadId || !form.date) return
    // Wall-clock Tashkent time — the reminder dispatcher pins Asia/Tashkent
    // everywhere it formats/compares times, so no timezone math is needed here.
    const remind_at = new Date(`${form.date}T${form.time}:00`).toISOString()
    const { data: auth } = await supabase.auth.getUser()
    await supabase.from("lead_reminders").insert({
      lead_id: leadId, assignee_id: form.assignee_id || null, remind_at, kind: form.kind, note: form.note || null,
      created_by: auth.user?.id ?? null,
    })
    setForm({ assignee_id: "", date: "", time: "10:00", kind: "call_back", note: "" })
    load()
  }

  async function remove(id: string) {
    await supabase.from("lead_reminders").delete().eq("id", id)
    load()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Eslatma — ${leadName}`}>
      <div className="space-y-4">
        <form onSubmit={create} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sana</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <Label>Vaqt (Toshkent)</Label>
              <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Turi</Label>
              <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {REMINDER_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Kimga</Label>
              <Select value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}>
                <option value="">Tanlanmagan</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <Label>Izoh (ixtiyoriy)</Label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Masalan: to'lov summasi bo'yicha kelishish" />
          </div>
          <Button type="submit" variant="accent" className="w-full">Eslatma qo'shish</Button>
        </form>

        <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
          {items.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-xs">
              <div>
                <div className="font-medium">{REMINDER_KINDS.find((k) => k.key === r.kind)?.label ?? r.kind}</div>
                <div className="text-[var(--color-ink-faint)]">{formatDateTime(r.remind_at)}{r.note ? ` — ${r.note}` : ""}</div>
              </div>
              <button
                onClick={() => remove(r.id)}
                className="cursor-pointer rounded p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="text-xs text-[var(--color-ink-faint)]">Eslatmalar yo'q</p>}
        </div>
      </div>
    </Dialog>
  )
}
