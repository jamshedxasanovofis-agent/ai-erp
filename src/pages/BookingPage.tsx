import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { CheckCircle2, Clock } from "lucide-react"

type Meeting = {
  id: string
  assignee_id: string | null
  scheduled_at: string
  duration_minutes: number
  status: string
  booking_token: string
}

function slotsForDay(date: Date) {
  const slots: Date[] = []
  const start = new Date(date)
  start.setHours(9, 0, 0, 0)
  const end = new Date(date)
  end.setHours(22, 0, 0, 0)
  for (let t = start; t < end; t = new Date(t.getTime() + 30 * 60000)) {
    slots.push(new Date(t))
  }
  return slots
}

export default function BookingPage() {
  const { token } = useParams<{ token: string }>()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)
  const [selected, setSelected] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      if (!token) return
      const { data } = await supabase.from("meetings").select("*").eq("booking_token", token).maybeSingle()
      const m = data as Meeting | null
      setMeeting(m)
      if (m) {
        setConfirmed(m.status === "tasdiqlangan")
        if (m.assignee_id) {
          const day = new Date(m.scheduled_at)
          const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0)
          const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999)
          const { data: others } = await supabase
            .from("meetings")
            .select("scheduled_at, duration_minutes")
            .eq("assignee_id", m.assignee_id)
            .neq("status", "bekor_qilingan")
            .gte("scheduled_at", dayStart.toISOString())
            .lte("scheduled_at", dayEnd.toISOString())
          const busySet = new Set<string>()
          for (const o of others ?? []) {
            busySet.add(new Date(o.scheduled_at).toISOString())
          }
          setBusy(busySet)
        }
      }
      setLoading(false)
    }
    load()
  }, [token])

  const slots = useMemo(() => (meeting ? slotsForDay(new Date(meeting.scheduled_at)) : []), [meeting])

  async function confirm() {
    if (!meeting || !selected) return
    setSaving(true)
    await supabase.from("meetings").update({ scheduled_at: selected.toISOString(), status: "tasdiqlangan" }).eq("booking_token", meeting.booking_token)
    supabase.functions.invoke("meeting-notify", { body: { meeting_id: meeting.id, event: "confirmed" } })
    setConfirmed(true)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6 text-center">
        <p className="text-sm text-[var(--color-ink-soft)]">Havola topilmadi yoki eskirgan.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-6 py-16">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">Uchrashuv vaqtini tanlang</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">O'zingizga qulay bo'sh vaqtni belgilang</p>
        </div>

        {confirmed ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle2 size={36} className="text-[var(--color-success)]" />
              <div className="font-medium">Uchrashuv tasdiqlandi</div>
              <div className="text-sm text-[var(--color-ink-soft)]">
                {new Date(meeting.scheduled_at).toLocaleString("uz-UZ", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-5">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
                <Clock size={13} /> Bo'sh vaqtlar (9:00 – 22:00)
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => {
                  const iso = s.toISOString()
                  const isBusy = busy.has(iso)
                  const isSelected = selected?.toISOString() === iso
                  return (
                    <button
                      key={iso}
                      disabled={isBusy}
                      onClick={() => setSelected(s)}
                      className={`cursor-pointer rounded-[var(--radius-sm)] border px-2 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                        isSelected
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)]"
                      }`}
                    >
                      {s.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                    </button>
                  )
                })}
              </div>
              <Button variant="accent" className="mt-5 w-full" disabled={!selected || saving} onClick={confirm}>
                {saving ? "Saqlanmoqda..." : "Tasdiqlash"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
