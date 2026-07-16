import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { CheckCircle2, Clock, ChevronLeft, ChevronRight } from "lucide-react"

const DAYS_AHEAD = 14

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

function dayLabel(d: Date, today: Date) {
  const isToday = d.toDateString() === today.toDateString()
  const tomorrow = new Date(today.getTime() + 86400000)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const date = d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" })
  if (isToday) return `Bugun, ${date}`
  if (isTomorrow) return `Ertaga, ${date}`
  return d.toLocaleDateString("uz-UZ", { weekday: "short", day: "2-digit", month: "2-digit" })
}

export default function PublicBookingPage() {
  const { leadToken } = useParams<{ leadToken: string }>()
  const today = useMemo(() => new Date(), [])
  const [dayOffset, setDayOffset] = useState(0)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null)
  const [leadInvalid, setLeadInvalid] = useState(false)

  const selectedDay = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() + dayOffset)
    return d
  }, [today, dayOffset])

  const slots = useMemo(() => slotsForDay(selectedDay), [selectedDay])

  useEffect(() => {
    async function loadLead() {
      const { data } = await supabase.from("lead_booking_info").select("id").eq("booking_token", leadToken).maybeSingle()
      if (!data) setLeadInvalid(true)
    }
    loadLead()
  }, [leadToken])

  useEffect(() => {
    async function loadBusy() {
      setLoading(true)
      setSelected(null)
      const dayStart = new Date(selectedDay); dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(selectedDay); dayEnd.setHours(23, 59, 59, 999)
      const { data } = await supabase
        .from("meeting_slots")
        .select("scheduled_at")
        .gte("scheduled_at", dayStart.toISOString())
        .lte("scheduled_at", dayEnd.toISOString())
      const busySet = new Set<string>()
      for (const row of data ?? []) busySet.add(new Date(row.scheduled_at).toISOString())
      setBusy(busySet)
      setLoading(false)
    }
    loadBusy()
  }, [selectedDay])

  async function confirm(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ lead_token: leadToken, scheduled_at: selected.toISOString() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Xatolik yuz berdi")
        setBusy((prev) => new Set(prev).add(selected.toISOString()))
        setSelected(null)
        return
      }
      setConfirmedAt(selected.toISOString())
    } catch {
      setError("Tarmoq xatosi, qayta urinib ko'ring")
    } finally {
      setSaving(false)
    }
  }

  if (leadInvalid) {
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
          <h1 className="text-xl font-semibold">Salom! Qulay vaqtni tanlang</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">O'zingizga qulay kun va vaqtni tanlang</p>
        </div>

        {confirmedAt ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle2 size={36} className="text-[var(--color-success)]" />
              <div className="font-medium">Uchrashuv tasdiqlandi</div>
              <div className="text-sm text-[var(--color-ink-soft)]">
                {new Date(confirmedAt).toLocaleString("uz-UZ", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}
              </div>
              <p className="mt-2 max-w-xs text-xs text-[var(--color-ink-faint)]">Tez orada siz bilan bog'lanamiz. Rahmat!</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-5">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDayOffset((o) => Math.max(0, o - 1))}
                  disabled={dayOffset === 0}
                  className="cursor-pointer rounded-full p-1.5 text-[var(--color-ink-faint)] hover:bg-[var(--color-surface-2)] disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="text-sm font-semibold">{dayLabel(selectedDay, today)}</div>
                <button
                  type="button"
                  onClick={() => setDayOffset((o) => Math.min(DAYS_AHEAD, o + 1))}
                  disabled={dayOffset === DAYS_AHEAD}
                  className="cursor-pointer rounded-full p-1.5 text-[var(--color-ink-faint)] hover:bg-[var(--color-surface-2)] disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
                <Clock size={13} /> Bo'sh vaqtlar (9:00 – 22:00)
              </div>
              {loading ? (
                <div className="py-8 text-center text-xs text-[var(--color-ink-faint)]">Yuklanmoqda...</div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((s) => {
                    const iso = s.toISOString()
                    const isBusy = busy.has(iso)
                    const isSelected = selected?.toISOString() === iso
                    return (
                      <button
                        key={iso}
                        type="button"
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
              )}

              {selected && (
                <form onSubmit={confirm} className="mt-5 space-y-3 border-t border-[var(--color-border)] pt-4">
                  {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
                  <Button type="submit" variant="accent" className="w-full" disabled={saving}>
                    {saving ? "Saqlanmoqda..." : "Tasdiqlash"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
