import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { Input, Label, Select, Textarea } from "@/components/ui/Input"
import { FileUpload } from "@/components/ui/FileUpload"
import { Comments } from "@/components/ui/Comments"
import { formatDate } from "@/lib/utils"
import { Plus, Link2, Paperclip, Trash2 } from "lucide-react"

const STATUS_TONE: Record<string, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  kutilmoqda: "warning",
  jarayonda: "accent",
  berildi: "success",
  yakunlandi: "success",
  rad_etildi: "danger",
}
const STATUS_LABEL: Record<string, string> = {
  kutilmoqda: "Kutilmoqda",
  jarayonda: "Jarayonda",
  berildi: "Berildi",
  yakunlandi: "Yakunlandi",
  rad_etildi: "Rad etildi",
}

type Demo = {
  id: string
  client_name: string
  type: string
  status: string
  requirements: string | null
  scheduled_at: string | null
  deadline: string | null
  demo_link: string | null
  attachment_url: string | null
}

const emptyForm = { client_name: "", type: "demo", status: "kutilmoqda", requirements: "", scheduled_at: "", deadline: "", demo_link: "", attachment_url: "" }

export default function DemoTracker() {
  const [items, setItems] = useState<Demo[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Demo | null>(null)
  const [form, setForm] = useState(emptyForm)

  async function load() {
    const { data } = await supabase.from("demo_requests").select("*").order("created_at", { ascending: false })
    setItems((data as Demo[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }
  function openEdit(d: Demo) {
    setEditing(d)
    setForm({
      client_name: d.client_name, type: d.type, status: d.status, requirements: d.requirements ?? "",
      scheduled_at: d.scheduled_at ?? "", deadline: d.deadline ?? "", demo_link: d.demo_link ?? "", attachment_url: d.attachment_url ?? "",
    })
    setOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      client_name: form.client_name,
      type: form.type,
      status: form.status,
      requirements: form.requirements || null,
      scheduled_at: form.scheduled_at || null,
      deadline: form.deadline || null,
      demo_link: form.demo_link || null,
      attachment_url: form.attachment_url || null,
    }
    if (editing) {
      await supabase.from("demo_requests").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("demo_requests").insert(payload)
    }
    setOpen(false)
    load()
  }

  async function remove(d: Demo) {
    if (!confirm(`"${d.client_name}" yozuvini o‘chirishni tasdiqlaysizmi?`)) return
    await supabase.from("demo_requests").delete().eq("id", d.id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">TZ / Demo</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Kimga demo berildi, kimdan TZ olindi</p>
        </div>
        <Button variant="accent" onClick={openNew}>
          <Plus size={15} /> Yangi so‘rov
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((d) => (
          <Card key={d.id} className="cursor-pointer" onClick={() => openEdit(d)}>
            <CardContent className="pt-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h4 className="font-medium">{d.client_name}</h4>
                <div className="flex items-center gap-1.5">
                  <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(d) }}
                    className="cursor-pointer rounded p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="mb-1 text-xs uppercase tracking-wide text-[var(--color-ink-faint)]">{d.type === "demo" ? "Demo" : "TZ"}</div>
              {d.requirements && <p className="mb-2 text-xs text-[var(--color-ink-soft)]">{d.requirements}</p>}
              <div className="mb-2 text-xs text-[var(--color-ink-faint)]">
                {d.scheduled_at && <>Reja: {formatDate(d.scheduled_at)} · </>}
                {d.deadline && <>Muddat: {formatDate(d.deadline)}</>}
              </div>
              <div className="flex gap-3">
                {d.demo_link && (
                  <a href={d.demo_link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline">
                    <Link2 size={11} /> Demo havolasi
                  </a>
                )}
                {d.attachment_url && (
                  <a href={d.attachment_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline">
                    <Paperclip size={11} /> TZ fayli
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-[var(--color-ink-faint)]">Hozircha yozuvlar yo‘q.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen} title={editing ? "TZ / Demo tahrirlash" : "Yangi TZ / Demo so‘rovi"}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <Label>Mijoz</Label>
            <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Turi</Label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="demo">Demo</option>
                <option value="tz">TZ</option>
              </Select>
            </div>
            <div>
              <Label>Holati</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <Label>Talablar / izoh</Label>
            <Textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Reja sanasi</Label>
              <Input type="date" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </div>
            <div>
              <Label>Muddat</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Demo havolasi</Label>
            <Input value={form.demo_link} onChange={(e) => setForm({ ...form, demo_link: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <Label>TZ fayli</Label>
            <FileUpload folder="tz" value={form.attachment_url} onUploaded={(url) => setForm({ ...form, attachment_url: url })} />
          </div>
          <Button type="submit" variant="accent" className="w-full">{editing ? "Saqlash" : "Qo‘shish"}</Button>
        </form>
        {editing && <Comments entityType="demo_request" entityId={editing.id} />}
      </Dialog>
    </div>
  )
}
