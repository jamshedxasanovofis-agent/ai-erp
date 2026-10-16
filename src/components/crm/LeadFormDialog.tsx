import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Dialog } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input, Label, Select } from "@/components/ui/Input"
import { PhoneInput, AmountInput } from "@/components/ui/MaskedInputs"
import { MultiAssigneeSelect } from "@/components/ui/MultiAssigneeSelect"
import { Comments } from "@/components/ui/Comments"
import { HistoryButton } from "@/components/ui/HistoryPanel"
import { logFieldChanges } from "@/lib/history"
import { TEMPERATURES, SOURCES, TIERS, REGIONS, BUSINESS_TYPES, BUSINESS_FIELD_MAP, LANGUAGES, FUNNELS } from "@/lib/crmConstants"
import { formatDateTime } from "@/lib/utils"
import type { Lead, ProfileOption } from "@/lib/crmTypes"

const FIELD_LABELS: Record<string, string> = {
  client_name: "Mijoz ismi", company: "Kompaniya", activity_name: "Faoliyat nomi", phone: "Telefon",
  amount: "Summa", project_type: "Loyiha turi", employees_count: "Xodimlar soni", budget: "Byudjet",
  temperature: "Harorat", source: "Manba", region: "Viloyat", business_type: "Biznes turi",
  language: "Til", tier: "Tier", funnel: "Voronka", deadline: "Deadline", assignee_ids: "Mas'ul xodimlar",
}

const emptyForm = {
  client_name: "", company: "", activity_name: "", phone: "", amount: "", project_type: "", employees_count: "", budget: "",
  temperature: "", source: "", region: "", business_type: "", language: "", tier: "", funnel: "call_center", deadline: "",
  assignee_ids: [] as string[],
}

function leadToForm(lead: Lead) {
  const businessFieldRaw = lead.form_data?.business_field
  const suggestedBusinessType = !lead.business_type && typeof businessFieldRaw === "string" ? BUSINESS_FIELD_MAP[businessFieldRaw] : undefined
  // Falls back to the legacy single `assigned_to` column for leads saved
  // before assignee_ids existed (the migration backfills it, but this keeps
  // the dialog correct even if a row somehow slipped through).
  const assigneeIds = lead.assignee_ids?.length ? lead.assignee_ids : lead.assigned_to ? [lead.assigned_to] : []
  return {
    client_name: lead.client_name, company: lead.company ?? "", activity_name: lead.activity_name ?? "", phone: lead.phone ?? "",
    amount: lead.amount != null ? String(lead.amount) : "", project_type: lead.project_type ?? "",
    employees_count: lead.employees_count != null ? String(lead.employees_count) : "", budget: lead.budget ?? "",
    temperature: lead.temperature ?? "", source: lead.source ?? "", region: lead.region ?? "",
    business_type: lead.business_type ?? suggestedBusinessType ?? "", language: lead.language ?? "", tier: lead.tier ?? "",
    funnel: lead.funnel ?? "call_center", deadline: lead.deadline ? lead.deadline.slice(0, 10) : "",
    assignee_ids: assigneeIds,
  }
}

export function LeadFormDialog({ lead, open, onOpenChange, profiles, defaultFunnel, onSaved }: {
  lead: Lead | null
  open: boolean
  onOpenChange: (v: boolean) => void
  profiles: ProfileOption[]
  defaultFunnel?: "marketing" | "call_center"
  onSaved: () => void
}) {
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (!open) return
    setForm(lead ? leadToForm(lead) : { ...emptyForm, funnel: defaultFunnel ?? "call_center" })
  }, [lead, open, defaultFunnel])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      client_name: form.client_name,
      company: form.company || null,
      activity_name: form.activity_name || null,
      phone: form.phone || null,
      amount: form.amount ? Number(form.amount) : null,
      project_type: form.project_type || null,
      employees_count: form.employees_count ? Number(form.employees_count) : null,
      budget: form.budget || null,
      temperature: form.temperature || null,
      source: form.source || null,
      region: form.region || null,
      business_type: form.business_type || null,
      language: form.language || null,
      tier: form.tier || null,
      funnel: form.funnel,
      deadline: form.deadline || null,
      assigned_to: form.assignee_ids[0] ?? null,
      assignee_ids: form.assignee_ids,
    }
    const previousIds = lead ? (lead.assignee_ids?.length ? lead.assignee_ids : lead.assigned_to ? [lead.assigned_to] : []) : []
    const newlyAssigned = form.assignee_ids.filter((id) => !previousIds.includes(id))
    const { error } = lead
      ? await supabase.from("leads").update(payload).eq("id", lead.id)
      : await supabase.from("leads").insert({ ...payload, stage: "potensial_mijoz" })
    if (error) {
      alert("Lidni saqlab bo'lmadi: " + error.message)
      return
    }
    if (lead) {
      await logFieldChanges("lead", lead.id, leadToForm(lead), form, FIELD_LABELS)
    }
    if (lead && newlyAssigned.length) {
      for (const recipientId of newlyAssigned) {
        await supabase.from("notifications").insert({
          type: "new_lead_assigned",
          entity_type: "lead",
          entity_id: lead.id,
          recipient_id: recipientId,
          title: "Sizga yangi lid biriktirildi",
          body: form.client_name,
        })
      }
    }
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={lead ? "Lidni tahrirlash" : "Yangi lid qo'shish"}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Mijoz ismi</Label>
            <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} required />
          </div>
          <div>
            <Label>Telefon</Label>
            <PhoneInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </div>
        </div>
        {typeof lead?.form_data?.telegram_username === "string" && lead.form_data.telegram_username && (
          <div className="-mt-1.5 text-xs text-[var(--color-ink-soft)]">
            Telegram: <a
              href={`https://t.me/${lead.form_data.telegram_username.replace(/^@/, "")}`}
              target="_blank" rel="noreferrer"
              className="font-medium text-[var(--color-accent)] hover:underline"
            >{lead.form_data.telegram_username}</a>
          </div>
        )}
        <div>
          <Label>Kompaniya</Label>
          <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </div>
        <div>
          <Label>Faoliyat nomi</Label>
          <Input value={form.activity_name} onChange={(e) => setForm({ ...form, activity_name: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Harorat</Label>
            <Select value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })}>
              <option value="">—</option>
              {TEMPERATURES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Manba</Label>
            <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              <option value="">—</option>
              {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Tier</Label>
            <Select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
              <option value="">—</option>
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Viloyat</Label>
            <Select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
              <option value="">—</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
          <div>
            <Label>Biznes turi</Label>
            <Select value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}>
              <option value="">—</option>
              {BUSINESS_TYPES.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Til</Label>
            <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
              <option value="">—</option>
              {LANGUAGES.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Voronka</Label>
            <Select value={form.funnel} onChange={(e) => setForm({ ...form, funnel: e.target.value })}>
              {FUNNELS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Uchrashuv/deadline sanasi</Label>
            <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Mas'ul xodimlar</Label>
          <MultiAssigneeSelect value={form.assignee_ids} onChange={(ids) => setForm({ ...form, assignee_ids: ids })} profiles={profiles} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Summa</Label>
            <AmountInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
          </div>
          <div>
            <Label>Xodimlar soni</Label>
            <Input type="number" value={form.employees_count} onChange={(e) => setForm({ ...form, employees_count: e.target.value })} />
          </div>
          <div>
            <Label>Byudjet</Label>
            <Input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Loyiha turi</Label>
          <Input value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })} />
        </div>
        <Button type="submit" variant="accent" className="w-full">{lead ? "Saqlash" : "Qo'shish"}</Button>
      </form>

      {lead && (
        <div className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4 text-sm">
          <div className="flex items-center justify-between text-xs text-[var(--color-ink-faint)]">
            <span>Lid tushgan sana: {lead.submitted_at ? formatDateTime(lead.submitted_at) : "—"}</span>
            <HistoryButton entityType="lead" entityId={lead.id} />
          </div>
          {lead.form_data && Object.keys(lead.form_data).length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-medium text-[var(--color-ink-soft)]">Forma orqali topshirilgan ma'lumotlar</div>
              <div className="space-y-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] p-3 text-xs">
                {Object.entries(lead.form_data).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <span className="text-[var(--color-ink-faint)]">{k}</span>
                    <span>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Comments entityType="lead" entityId={lead.id} />
        </div>
      )}
    </Dialog>
  )
}
