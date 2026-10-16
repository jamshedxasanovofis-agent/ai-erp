import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { Input, Label, Select, Textarea } from "@/components/ui/Input"
import { PhoneInput } from "@/components/ui/MaskedInputs"
import { Avatar } from "@/components/ui/Avatar"
import { Comments } from "@/components/ui/Comments"
import { formatDate, formatUzPhone } from "@/lib/utils"
import { Plus, Star, MessageCircle } from "lucide-react"

const LOYALTY_TONE: Record<string, "success" | "neutral" | "danger"> = {
  sodiq: "success",
  oddiy: "neutral",
  qopol: "danger",
}
const LOYALTY_LABEL: Record<string, string> = {
  sodiq: "Sodiq mijoz",
  oddiy: "Oddiy mijoz",
  qopol: "Qo'pol mijoz",
}

const TIER_TONE: Record<string, "accent" | "success" | "warning" | "neutral"> = {
  A: "accent", B: "success", C: "warning", CS: "neutral",
}

const INTERACTION_TYPES = [
  { key: "note", label: "Eslatma" },
  { key: "call", label: "Qo'ng'iroq" },
  { key: "problem", label: "Muammo" },
  { key: "resolution", label: "Yechim" },
]

type Client = {
  id: string
  name: string
  brand: string | null
  phone: string | null
  contact_person: string | null
  icp_portrait: string | null
  character_notes: string | null
  budget_level: string | null
  loyalty_status: string
  satisfaction_score: number | null
  usage_count: number
  tier: string | null
  first_contact_date: string | null
  last_contact_date: string | null
  referral_source: string | null
  is_referral: boolean
}

type Interaction = { id: string; note: string; interaction_type: string; created_at: string }

const emptyForm = {
  name: "", brand: "", phone: "", contact_person: "", icp_portrait: "", character_notes: "", budget_level: "",
  loyalty_status: "oddiy", satisfaction_score: "5", tier: "", first_contact_date: "", referral_source: "", is_referral: false,
}

function InteractionLog({ clientId, onLogged }: { clientId: string; onLogged: () => void }) {
  const [items, setItems] = useState<Interaction[]>([])
  const [note, setNote] = useState("")
  const [type, setType] = useState("note")

  async function load() {
    const { data } = await supabase
      .from("client_interactions")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
    setItems((data as Interaction[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [clientId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    await supabase.from("client_interactions").insert({ client_id: clientId, note: note.trim(), interaction_type: type })
    await supabase.from("clients").update({ last_contact_date: new Date().toISOString().slice(0, 10) }).eq("id", clientId)
    setNote("")
    load()
    onLogged()
  }

  return (
    <div className="mt-2">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
        <MessageCircle size={13} /> Aloqa tarixi
      </div>
      <div className="mb-2 max-h-40 space-y-2 overflow-y-auto">
        {items.map((it) => (
          <div key={it.id} className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-3 py-2 text-xs">
            <div className="mb-0.5 flex items-center justify-between text-[10px] text-[var(--color-ink-faint)]">
              <span>{INTERACTION_TYPES.find((t) => t.key === it.interaction_type)?.label ?? it.interaction_type}</span>
              <span>{formatDate(it.created_at)}</span>
            </div>
            <div className="text-[var(--color-ink)]">{it.note}</div>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-[var(--color-ink-faint)]">Hozircha aloqa yozuvi yo'q.</p>}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-32 shrink-0">
          {INTERACTION_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </Select>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nima bo'ldi..." className="min-h-10 flex-1" />
        <Button type="submit" variant="outline" size="sm" className="self-end">Qo'shish</Button>
      </form>
    </div>
  )
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Client | null>(null)
  const [form, setForm] = useState(emptyForm)

  async function load() {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false })
    setClients((data as Client[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (selected) {
      const fresh = clients.find((c) => c.id === selected.id)
      if (fresh) setSelected(fresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients])

  async function addClient(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from("clients").insert({
      name: form.name,
      brand: form.brand || null,
      phone: form.phone || null,
      contact_person: form.contact_person || null,
      icp_portrait: form.icp_portrait || null,
      character_notes: form.character_notes || null,
      budget_level: form.budget_level || null,
      loyalty_status: form.loyalty_status,
      satisfaction_score: Number(form.satisfaction_score),
      tier: form.tier || null,
      first_contact_date: form.first_contact_date || null,
      referral_source: form.referral_source || null,
      is_referral: form.is_referral,
    })
    setForm(emptyForm)
    setOpen(false)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Mijozlar bazasi</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Mijoz kartochkalari, ICP portret va sodiqlik darajasi</p>
        </div>
        <Button variant="accent" onClick={() => setOpen(true)}>
          <Plus size={15} /> Yangi mijoz
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((c) => (
          <Card key={c.id} className="cursor-pointer transition-transform hover:-translate-y-0.5" onClick={() => setSelected(c)}>
            <CardContent className="pt-5">
              <div className="mb-3 flex items-center gap-3">
                <Avatar name={c.name} size={38} />
                <div>
                  <div className="font-medium">{c.name}</div>
                  {c.brand && <div className="text-xs text-[var(--color-ink-soft)]">{c.brand}</div>}
                </div>
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone={LOYALTY_TONE[c.loyalty_status]}>{LOYALTY_LABEL[c.loyalty_status]}</Badge>
                {c.tier && <Badge tone={TIER_TONE[c.tier]}>Tier {c.tier}</Badge>}
                {c.satisfaction_score != null && (
                  <span className="flex items-center gap-1 text-xs text-[var(--color-ink-soft)]">
                    <Star size={11} className="fill-[var(--color-warning)] text-[var(--color-warning)]" /> {c.satisfaction_score}/10
                  </span>
                )}
              </div>
              <div className="text-xs text-[var(--color-ink-faint)]">Xizmatdan foydalangan: {c.usage_count} marta</div>
              {c.last_contact_date && (
                <div className="mt-1 text-xs text-[var(--color-ink-faint)]">Oxirgi aloqa: {formatDate(c.last_contact_date)}</div>
              )}
            </CardContent>
          </Card>
        ))}
        {clients.length === 0 && <p className="text-sm text-[var(--color-ink-faint)]">Mijozlar yo'q.</p>}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge tone={LOYALTY_TONE[selected.loyalty_status]}>{LOYALTY_LABEL[selected.loyalty_status]}</Badge>
              {selected.tier && <Badge tone={TIER_TONE[selected.tier]}>Tier {selected.tier}</Badge>}
              {selected.is_referral && <Badge tone="accent">Sarafan orqali</Badge>}
            </div>
            {selected.phone && <div><span className="font-medium">Telefon: </span>{formatUzPhone(selected.phone)}</div>}
            {selected.contact_person && <div><span className="font-medium">Kontakt shaxs: </span>{selected.contact_person}</div>}
            {selected.icp_portrait && (
              <div><span className="font-medium">ICP portret: </span>{selected.icp_portrait}</div>
            )}
            {selected.character_notes && (
              <div><span className="font-medium">Xarakteri: </span>{selected.character_notes}</div>
            )}
            {selected.budget_level && (
              <div><span className="font-medium">Pul imkoniyati: </span>{selected.budget_level}</div>
            )}
            {selected.referral_source && (
              <div><span className="font-medium">Referral manba: </span>{selected.referral_source}</div>
            )}
            <div className="flex gap-4 text-xs text-[var(--color-ink-faint)]">
              <span>Birinchi aloqa: {selected.first_contact_date ? formatDate(selected.first_contact_date) : "—"}</span>
              <span>Oxirgi aloqa: {selected.last_contact_date ? formatDate(selected.last_contact_date) : "—"}</span>
            </div>
            <InteractionLog clientId={selected.id} onLogged={load} />
            <Comments entityType="client" entityId={selected.id} />
          </div>
        )}
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen} title="Yangi mijoz">
        <form onSubmit={addClient} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ism / kompaniya</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Brend</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefon</Label>
              <PhoneInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            </div>
            <div>
              <Label>Kontakt shaxs</Label>
              <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>ICP portret</Label>
            <Textarea value={form.icp_portrait} onChange={(e) => setForm({ ...form, icp_portrait: e.target.value })} />
          </div>
          <div>
            <Label>Xarakteri / eslatmalar</Label>
            <Textarea value={form.character_notes} onChange={(e) => setForm({ ...form, character_notes: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Pul imkoniyati</Label>
              <Input value={form.budget_level} onChange={(e) => setForm({ ...form, budget_level: e.target.value })} />
            </div>
            <div>
              <Label>Holati</Label>
              <Select value={form.loyalty_status} onChange={(e) => setForm({ ...form, loyalty_status: e.target.value })}>
                {Object.entries(LOYALTY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </div>
            <div>
              <Label>Mamnunlik (1-10)</Label>
              <Input type="number" min={1} max={10} value={form.satisfaction_score} onChange={(e) => setForm({ ...form, satisfaction_score: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Tier</Label>
              <Select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                <option value="">—</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="CS">CS</option>
              </Select>
            </div>
            <div>
              <Label>Birinchi aloqa sanasi</Label>
              <Input type="date" value={form.first_contact_date} onChange={(e) => setForm({ ...form, first_contact_date: e.target.value })} />
            </div>
            <div className="flex items-end gap-2 pb-2.5">
              <input
                id="is_referral"
                type="checkbox"
                checked={form.is_referral}
                onChange={(e) => setForm({ ...form, is_referral: e.target.checked })}
                className="h-4 w-4 cursor-pointer"
              />
              <label htmlFor="is_referral" className="cursor-pointer text-sm text-[var(--color-ink-soft)]">Sarafan orqali</label>
            </div>
          </div>
          {form.is_referral && (
            <div>
              <Label>Kim tavsiya qildi</Label>
              <Input value={form.referral_source} onChange={(e) => setForm({ ...form, referral_source: e.target.value })} />
            </div>
          )}
          <Button type="submit" variant="accent" className="w-full">Qo'shish</Button>
        </form>
      </Dialog>
    </div>
  )
}
