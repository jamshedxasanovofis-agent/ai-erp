import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input, Label, Textarea, Select } from "@/components/ui/Input"
import { Tabs } from "@/components/ui/Tabs"
import { Avatar } from "@/components/ui/Avatar"
import { Plus, KeyRound, ExternalLink, Eye, EyeOff, ArrowLeft } from "lucide-react"

type Doc = {
  id: string
  title: string
  folder: string | null
  login: string | null
  password_enc: string | null
  url: string | null
  notes: string | null
  client_id: string | null
  spend_notes: string | null
  project_id: string | null
  color: string
}
type Client = { id: string; name: string; brand: string | null }
type ProjectOption = { id: string; name: string }

const COLORS = [
  { key: "slate", label: "Kulrang", css: "var(--color-ink-faint)" },
  { key: "indigo", label: "Indigo", css: "var(--color-accent)" },
  { key: "emerald", label: "Yashil", css: "var(--color-success)" },
  { key: "amber", label: "Sariq", css: "var(--color-warning)" },
  { key: "rose", label: "Qizil", css: "var(--color-danger)" },
]

const emptyForm = { title: "", folder: "Umumiy", login: "", password_enc: "", url: "", notes: "", spend_notes: "", project_id: "", color: "slate" }

export default function Documents() {
  const [view, setView] = useState<"bizning" | "mijozlar">("bizning")
  const [docs, setDocs] = useState<Doc[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [open, setOpen] = useState(false)
  const [reveal, setReveal] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState(emptyForm)

  async function load() {
    const [{ data: d }, { data: c }, { data: p }] = await Promise.all([
      supabase.from("documents").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name, brand"),
      supabase.from("projects").select("id, name"),
    ])
    setDocs((d as Doc[]) ?? [])
    setClients((c as Client[]) ?? [])
    setProjects((p as ProjectOption[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  async function addDoc(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from("documents").insert({
      ...form,
      project_id: form.project_id || null,
      client_id: view === "mijozlar" ? selectedClient?.id ?? null : null,
    })
    setForm(emptyForm)
    setOpen(false)
    load()
  }

  const ownDocs = docs.filter((d) => !d.client_id)
  const folders = Array.from(new Set(ownDocs.map((d) => d.folder || "Umumiy")))
  const clientDocs = selectedClient ? docs.filter((d) => d.client_id === selectedClient.id) : []

  function renderDocCard(d: Doc) {
    const color = COLORS.find((c) => c.key === d.color) ?? COLORS[0]
    const project = projects.find((p) => p.id === d.project_id)
    return (
      <Card key={d.id} className="overflow-hidden">
        <div className="h-1 w-full" style={{ background: color.css }} />
        <CardContent className="pt-5">
          <div className="mb-2 flex items-center gap-2">
            <KeyRound size={14} className="text-[var(--color-accent)]" />
            <h4 className="font-medium">{d.title}</h4>
          </div>
          {project && <div className="text-xs text-[var(--color-ink-faint)]">Loyiha: {project.name}</div>}
          {d.login && <div className="text-xs text-[var(--color-ink-soft)]">Login: {d.login}</div>}
          {d.password_enc && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-soft)]">
              Parol: {reveal[d.id] ? d.password_enc : "••••••••"}
              <button
                onClick={() => setReveal((r) => ({ ...r, [d.id]: !r[d.id] }))}
                className="cursor-pointer text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
              >
                {reveal[d.id] ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          )}
          {d.url && (
            <a href={d.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline">
              Havola <ExternalLink size={11} />
            </a>
          )}
          {d.notes && <p className="mt-1.5 text-xs text-[var(--color-ink-faint)]">{d.notes}</p>}
          {d.spend_notes && (
            <p className="mt-1.5 rounded-[var(--radius-xs)] bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-ink-soft)]">
              💳 {d.spend_notes}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Xujjatlar</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Login, parol va kerakli hujjatlar bir joyda</p>
        </div>
        {(view === "bizning" || selectedClient) && (
          <Button variant="accent" onClick={() => setOpen(true)}>
            <Plus size={15} /> Yangi hujjat
          </Button>
        )}
      </div>

      <Tabs
        value={view}
        onChange={(v) => { setView(v); setSelectedClient(null) }}
        options={[{ value: "bizning", label: "Bizning hujjatlar" }, { value: "mijozlar", label: "Mijozlar hujjatlari" }]}
      />

      {view === "bizning" && (
        <div className="space-y-6">
          {folders.map((folder) => (
            <div key={folder}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">{folder}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ownDocs.filter((d) => (d.folder || "Umumiy") === folder).map(renderDocCard)}
              </div>
            </div>
          ))}
          {ownDocs.length === 0 && <p className="text-sm text-[var(--color-ink-faint)]">Hozircha hujjatlar yo'q.</p>}
        </div>
      )}

      {view === "mijozlar" && !selectedClient && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <Card key={c.id} className="cursor-pointer" onClick={() => setSelectedClient(c)}>
              <CardContent className="flex items-center gap-3 pt-5">
                <Avatar name={c.name} size={36} />
                <div>
                  <div className="font-medium">{c.name}</div>
                  {c.brand && <div className="text-xs text-[var(--color-ink-soft)]">{c.brand}</div>}
                </div>
              </CardContent>
            </Card>
          ))}
          {clients.length === 0 && <p className="text-sm text-[var(--color-ink-faint)]">Mijozlar yo'q.</p>}
        </div>
      )}

      {view === "mijozlar" && selectedClient && (
        <div className="space-y-4">
          <button onClick={() => setSelectedClient(null)} className="flex cursor-pointer items-center gap-1.5 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
            <ArrowLeft size={14} /> Mijozlar ro'yxatiga qaytish
          </button>
          <h3 className="text-sm font-semibold">{selectedClient.name}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clientDocs.map(renderDocCard)}
          </div>
          {clientDocs.length === 0 && <p className="text-sm text-[var(--color-ink-faint)]">Bu mijoz uchun hujjatlar yo'q.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen} title="Yangi hujjat">
        <form onSubmit={addDoc} className="space-y-3">
          <div>
            <Label>Nomi</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          {view === "bizning" && (
            <div>
              <Label>Papka</Label>
              <Input value={form.folder} onChange={(e) => setForm({ ...form, folder: e.target.value })} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Loyiha</Label>
              <Select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                <option value="">—</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Rang</Label>
              <Select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
                {COLORS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Login</Label>
              <Input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
            </div>
            <div>
              <Label>Parol</Label>
              <Input value={form.password_enc} onChange={(e) => setForm({ ...form, password_enc: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Havola</Label>
            <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </div>
          <div>
            <Label>Izoh</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {view === "mijozlar" && (
            <div>
              <Label>To'lov / xarajat eslatmasi</Label>
              <Textarea value={form.spend_notes} onChange={(e) => setForm({ ...form, spend_notes: e.target.value })} placeholder="Oylik $50, har oy 5-sanada to'lanadi" />
            </div>
          )}
          <Button type="submit" variant="accent" className="w-full">Qo'shish</Button>
        </form>
      </Dialog>
    </div>
  )
}
