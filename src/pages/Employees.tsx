import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input, Label, Select } from "@/components/ui/Input"
import { FileUpload } from "@/components/ui/FileUpload"
import { Avatar } from "@/components/ui/Avatar"
import { Plus, Send, CheckCircle2 } from "lucide-react"

type Profile = {
  id: string
  full_name: string
  position: string | null
  department: string | null
  manager_id: string | null
  phone: string | null
  avatar_url: string | null
  role: string | null
  telegram_chat_id: string | null
}

const ROLE_LABEL: Record<string, string> = { full: "To‘liq huquq", crm: "Faqat CRM", pending: "Kutilmoqda" }
const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined

function OrgNode({ profile, all, depth, onRoleChange }: { profile: Profile; all: Profile[]; depth: number; onRoleChange: (id: string, role: string) => void }) {
  const children = all.filter((p) => p.manager_id === profile.id)
  const [copied, setCopied] = useState(false)
  function copyTelegramLink() {
    if (!BOT_USERNAME) return
    navigator.clipboard.writeText(`https://t.me/${BOT_USERNAME}?start=emp_${profile.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className={depth > 0 ? "ml-6 border-l border-[var(--color-border)] pl-6" : ""}>
      <div className="mb-3 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3">
          <Avatar name={profile.full_name} src={profile.avatar_url} size={36} />
          <div>
            <div className="text-sm font-medium">{profile.full_name}</div>
            <div className="text-xs text-[var(--color-ink-soft)]">{profile.position || "—"} {profile.department ? `· ${profile.department}` : ""}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {profile.telegram_chat_id ? (
            <span title="Telegramga ulangan" className="text-[var(--color-success)]"><CheckCircle2 size={16} /></span>
          ) : (
            BOT_USERNAME && (
              <button
                onClick={copyTelegramLink}
                title="Telegram bot havolasini nusxalash"
                className="cursor-pointer rounded p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-accent)]"
              >
                {copied ? <CheckCircle2 size={16} className="text-[var(--color-success)]" /> : <Send size={16} />}
              </button>
            )
          )}
          <select
            value={profile.role ?? "pending"}
            onChange={(e) => onRoleChange(profile.id, e.target.value)}
            className="h-8 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs outline-none focus:border-[var(--color-accent)]"
          >
            {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      {children.map((c) => <OrgNode key={c.id} profile={c} all={all} depth={depth + 1} onRoleChange={onRoleChange} />)}
    </div>
  )
}

export default function Employees() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ full_name: "", position: "", department: "", manager_id: "", phone: "", avatar_url: "" })

  async function load() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: true })
    setProfiles((data as Profile[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from("profiles").insert({
      id: crypto.randomUUID(),
      full_name: form.full_name,
      position: form.position || null,
      department: form.department || null,
      manager_id: form.manager_id || null,
      phone: form.phone || null,
      avatar_url: form.avatar_url || null,
    })
    setForm({ full_name: "", position: "", department: "", manager_id: "", phone: "", avatar_url: "" })
    setOpen(false)
    load()
  }

  async function updateRole(id: string, role: string) {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role } : p)))
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id)
    if (error) {
      alert("Rolni o‘zgartirib bo‘lmadi: " + error.message)
      load()
    }
  }

  const roots = profiles.filter((p) => !p.manager_id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Xodimlar</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">ORG struktura, vazifa va vakolatlar</p>
        </div>
        <Button variant="accent" onClick={() => setOpen(true)}>
          <Plus size={15} /> Xodim qo‘shish
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5">
          {roots.length === 0 && <p className="text-sm text-[var(--color-ink-faint)]">Xodimlar yo‘q.</p>}
          {roots.map((r) => <OrgNode key={r.id} profile={r} all={profiles} depth={0} onRoleChange={updateRole} />)}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen} title="Yangi xodim">
        <form onSubmit={addEmployee} className="space-y-3">
          <div>
            <Label>To‘liq ism</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Lavozim</Label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div>
              <Label>Bo‘lim</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Rahbari</Label>
            <Select value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
              <option value="">Yo‘q (yuqori rahbar)</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Telefon</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Foto</Label>
            <FileUpload folder="avatars" value={form.avatar_url} onUploaded={(url) => setForm({ ...form, avatar_url: url })} accept="image/*" label="Foto yuklash" />
          </div>
          <Button type="submit" variant="accent" className="w-full">Qo‘shish</Button>
        </form>
      </Dialog>
    </div>
  )
}
