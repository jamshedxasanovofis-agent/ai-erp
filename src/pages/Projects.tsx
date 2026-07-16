import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Progress } from "@/components/ui/Progress"
import { Dialog } from "@/components/ui/Dialog"
import { Input, Label, Select } from "@/components/ui/Input"
import { FileUpload } from "@/components/ui/FileUpload"
import { Checkbox } from "@/components/ui/Checkbox"
import { Comments } from "@/components/ui/Comments"
import { HistoryButton } from "@/components/ui/HistoryPanel"
import { logFieldChanges } from "@/lib/history"
import { markStagePaid, markStageUnpaid } from "@/lib/paymentSync"
import {
  renderProposalHtml, renderSupportHtml, renderTzHtml, renderPaymentScheduleHtml, renderSupportActHtml,
  renderAccessActHtml, renderAcceptanceActHtml, renderNdaHtml, renderChangeRequestHtml,
} from "@/lib/proposalTemplate"
import { searchLeadByPhone, LEAD_OPTION_SELECT, type LeadOption } from "@/lib/crmSearch"
import { formatDate } from "@/lib/utils"
import { Plus, Pencil, Trash2, Search, FileText, Paperclip } from "lucide-react"

const STATUSES = [
  { key: "kutilmoqda", label: "Kutilmoqda", tone: "warning" as const },
  { key: "jarayonda", label: "Jarayonda", tone: "accent" as const },
  { key: "yopilgan", label: "Yopilgan", tone: "success" as const },
  { key: "toxtatilgan", label: "To‘xtatilgan", tone: "neutral" as const },
]

const PROJECT_COLORS = [
  { key: "indigo", label: "Indigo", css: "var(--color-accent)" },
  { key: "emerald", label: "Yashil", css: "var(--color-success)" },
  { key: "amber", label: "Sariq", css: "var(--color-warning)" },
  { key: "rose", label: "Qizil", css: "var(--color-danger)" },
]

type Project = {
  id: string
  name: string
  status: string
  progress: number
  start_date: string | null
  end_date: string | null
  description: string | null
  lead_id: string | null
  client_contact_name: string | null
  employees_count: number | null
  budget: string | null
  tz_file_url: string | null
  payment_type: string | null
  installments_count: number | null
  color: string
  billing_owner_id: string | null
  phone: string | null
  source: string | null
  region: string | null
  business_type: string | null
  language: string | null
  temperature: string | null
  tier: string | null
  project_type: string | null
  deadline: string | null
}

type PaymentStage = {
  id: string; title: string; amount: number; due_date: string | null; contract_id: string
  status?: string; paid_at?: string | null; receipt_url?: string | null; note?: string | null
  exchange_rate?: number | null
}

const PROJECT_FIELD_LABELS: Record<string, string> = {
  name: "Nomi", budget: "Byudjet", client_contact_name: "Mijoz vakili", employees_count: "Xodimlar soni",
  status: "Holati", progress: "Progress", description: "Izoh", payment_type: "To'lov turi",
  installments_count: "Qismlar soni", exchange_rate: "Kurs",
}
type StageForm = { id?: string; due_date: string; amount: string; receipt_url: string; note: string; paid: boolean }
type ProfileOption = { id: string; full_name: string }

function resizeStagesArray(current: StageForm[], count: number): StageForm[] {
  const next = [...current]
  while (next.length < count) next.push({ due_date: "", amount: "", receipt_url: "", note: "", paid: false })
  next.length = Math.max(0, count)
  return next
}

function ProjectCard({ p, onEdit, onDelete }: { p: Project; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: p.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 } : undefined
  const color = PROJECT_COLORS.find((c) => c.key === p.color)?.css ?? "var(--color-accent)"
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={isDragging ? "opacity-50" : ""}>
      <Card className="w-full cursor-grab overflow-hidden rounded-[var(--radius-md)] p-0 active:cursor-grabbing">
        <div className="h-1 w-full" style={{ background: color }} />
        <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-[13px] font-semibold">{p.name}</h3>
          <div className="flex shrink-0 gap-1">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="cursor-pointer rounded p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
            >
              <Pencil size={12} />
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="cursor-pointer rounded p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        {p.client_contact_name && <div className="mb-1 text-[11px] text-[var(--color-ink-soft)]">{p.client_contact_name}</div>}
        <div className="mb-2.5 text-[11px] text-[var(--color-ink-faint)]">
          {p.start_date ? formatDate(p.start_date) : "—"} → {p.end_date ? formatDate(p.end_date) : "—"}
        </div>
        <Progress value={p.progress} tone={p.progress === 100 ? "success" : "accent"} />
        <div className="mt-1.5 text-right text-xs text-[var(--color-ink-soft)]">{p.progress}%</div>
        </div>
      </Card>
    </div>
  )
}

function Column({ status, label, tone, count, children }: { status: string; label: string; tone: "warning" | "accent" | "success" | "neutral"; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div ref={setNodeRef} className={`w-[260px] shrink-0 rounded-[var(--radius-lg)] p-2 transition-colors ${isOver ? "bg-[var(--color-accent-soft)]" : ""}`}>
      <div className="mb-2.5 flex items-center gap-2 px-1.5">
        <Badge tone={tone}>{label}</Badge>
        <span className="text-xs text-[var(--color-ink-faint)]">{count}</span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

const emptyForm = {
  name: "", start_date: "", end_date: "", status: "jarayonda", progress: "0", description: "",
  lead_id: "", client_contact_name: "", employees_count: "", budget: "", tz_file_url: "",
  payment_type: "bir_martalik", installments_count: "2", color: "indigo", billing_owner_id: "",
  exchange_rate: "",
  phone: "", source: "", region: "", business_type: "", language: "", temperature: "", tier: "", project_type: "", deadline: "",
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [leadPhoneSearch, setLeadPhoneSearch] = useState("")
  const [leadResults, setLeadResults] = useState<LeadOption[]>([])
  const [attachedLead, setAttachedLead] = useState<LeadOption | null>(null)
  const [kpOpen, setKpOpen] = useState(false)
  const [kpHtml, setKpHtml] = useState<string | null>(null)
  const [supportOpen, setSupportOpen] = useState(false)
  const [supportHtml, setSupportHtml] = useState<string | null>(null)
  const [supportForm, setSupportForm] = useState({ support_tier: "start", support_months: "1" })
  const [docOpen, setDocOpen] = useState(false)
  const [docHtml, setDocHtml] = useState<string | null>(null)
  const [docTitle, setDocTitle] = useState("")
  const [projectTasks, setProjectTasks] = useState<{ id: string; title: string; progress: number }[]>([])
  const [projectStages, setProjectStages] = useState<PaymentStage[]>([])
  const [stagesForm, setStagesForm] = useState<StageForm[]>([])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  async function load() {
    const [{ data }, { data: pr }] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name"),
    ])
    setProjects((data as Project[]) ?? [])
    setProfiles((pr as ProfileOption[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setAttachedLead(null)
    setLeadPhoneSearch("")
    setLeadResults([])
    setProjectTasks([])
    setProjectStages([])
    setStagesForm([])
    setOpen(true)
  }
  async function openEdit(p: Project) {
    setEditing(p)
    setForm({
      name: p.name, start_date: p.start_date ?? "", end_date: p.end_date ?? "",
      status: p.status, progress: String(p.progress), description: p.description ?? "",
      lead_id: p.lead_id ?? "", client_contact_name: p.client_contact_name ?? "",
      employees_count: p.employees_count != null ? String(p.employees_count) : "",
      budget: p.budget ?? "", tz_file_url: p.tz_file_url ?? "",
      payment_type: p.payment_type ?? "bir_martalik",
      installments_count: p.installments_count != null ? String(p.installments_count) : "2",
      color: p.color ?? "indigo", billing_owner_id: p.billing_owner_id ?? "",
      exchange_rate: "",
      phone: p.phone ?? "", source: p.source ?? "", region: p.region ?? "", business_type: p.business_type ?? "",
      language: p.language ?? "", temperature: p.temperature ?? "", tier: p.tier ?? "",
      project_type: p.project_type ?? "", deadline: p.deadline ?? "",
    })
    if (p.lead_id) {
      const { data } = await supabase.from("leads").select(LEAD_OPTION_SELECT).eq("id", p.lead_id).single()
      setAttachedLead((data as LeadOption) ?? null)
    } else {
      setAttachedLead(null)
    }
    setLeadPhoneSearch("")
    setLeadResults([])
    const [{ data: tasks }, { data: contract }] = await Promise.all([
      supabase.from("tasks").select("id, title, progress").eq("project_id", p.id),
      supabase.from("contracts").select("id, exchange_rate").eq("project_id", p.id).limit(1).maybeSingle(),
    ])
    setProjectTasks((tasks as { id: string; title: string; progress: number }[]) ?? [])
    if (contract?.exchange_rate != null) {
      setForm((f) => ({ ...f, exchange_rate: String(contract.exchange_rate) }))
    }
    let loadedStages: PaymentStage[] = []
    if (contract) {
      const { data: stages } = await supabase.from("payment_stages").select("*").eq("contract_id", contract.id).order("due_date", { ascending: true })
      loadedStages = (stages as PaymentStage[]) ?? []
    }
    setProjectStages(loadedStages)
    if ((p.payment_type ?? "bir_martalik") === "bolib_tolash") {
      const count = p.installments_count ?? 2
      setStagesForm(
        Array.from({ length: count }, (_, i) => {
          const s = loadedStages[i]
          return s
            ? { id: s.id, due_date: s.due_date ?? "", amount: String(s.amount), receipt_url: s.receipt_url ?? "", note: s.note ?? "", paid: s.status === "tolandi" }
            : { due_date: "", amount: "", receipt_url: "", note: "", paid: false }
        })
      )
    } else {
      setStagesForm([])
    }
    setOpen(true)
  }

  const tasksAvgProgress = projectTasks.length ? Math.round(projectTasks.reduce((s, t) => s + t.progress, 0) / projectTasks.length) : null

  async function applyTaskProgress() {
    if (tasksAvgProgress == null) return
    setForm((f) => ({ ...f, progress: String(tasksAvgProgress) }))
  }

  async function runLeadPhoneSearch() {
    setLeadResults(await searchLeadByPhone(leadPhoneSearch))
  }

  function attachLead(lead: LeadOption) {
    setAttachedLead(lead)
    setForm((f) => ({
      ...f,
      lead_id: lead.id,
      client_contact_name: f.client_contact_name || lead.client_name,
      employees_count: f.employees_count || (lead.employees_count != null ? String(lead.employees_count) : ""),
      budget: f.budget || lead.budget || "",
      name: f.name || lead.company || lead.client_name,
      phone: f.phone || lead.phone || "",
      source: f.source || lead.source || "",
      region: f.region || lead.region || "",
      business_type: f.business_type || lead.business_type || "",
      language: f.language || lead.language || "",
      temperature: f.temperature || lead.temperature || "",
      tier: f.tier || lead.tier || "",
      project_type: f.project_type || lead.project_type || "",
      deadline: f.deadline || lead.deadline || "",
    }))
    setLeadResults([])
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: form.name,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
      progress: Number(form.progress),
      description: form.description || null,
      lead_id: form.lead_id || null,
      client_contact_name: form.client_contact_name || null,
      employees_count: form.employees_count ? Number(form.employees_count) : null,
      budget: form.budget || null,
      tz_file_url: form.tz_file_url || null,
      payment_type: form.payment_type || null,
      installments_count: form.payment_type === "bolib_tolash" ? Number(form.installments_count) : null,
      color: form.color,
      billing_owner_id: form.billing_owner_id || null,
      phone: form.phone || null,
      source: form.source || null,
      region: form.region || null,
      business_type: form.business_type || null,
      language: form.language || null,
      temperature: form.temperature || null,
      tier: form.tier || null,
      project_type: form.project_type || null,
      deadline: form.deadline || null,
    }
    let projectId = editing?.id ?? null
    if (editing) {
      const { error } = await supabase.from("projects").update(payload).eq("id", editing.id)
      if (error) {
        alert("Loyihani saqlab bo'lmadi: " + error.message)
        return
      }
      await logFieldChanges("project", editing.id, editing, { ...editing, ...payload, budget: payload.budget }, PROJECT_FIELD_LABELS)
    } else {
      const { data, error } = await supabase.from("projects").insert(payload).select("id").single()
      if (error || !data) {
        alert("Loyihani saqlab bo'lmadi: " + (error?.message ?? ""))
        return
      }
      projectId = data.id
    }
    if (form.payment_type === "bolib_tolash" && projectId) {
      await syncPaymentStages(projectId)
    } else if (projectId) {
      await ensureContract({ id: projectId, budget: form.budget })
    }
    setOpen(false)
    load()
  }

  async function ensureContract(project: { id: string; budget: string | null }): Promise<string | null> {
    const amount = project.budget && !isNaN(Number(project.budget)) ? Number(project.budget) : null
    const exchangeRate = form.exchange_rate && !isNaN(Number(form.exchange_rate)) ? Number(form.exchange_rate) : null
    const { data: existing } = await supabase.from("contracts").select("id").eq("project_id", project.id).limit(1).maybeSingle()
    if (existing) {
      await supabase.from("contracts").update({ amount, exchange_rate: exchangeRate }).eq("id", existing.id)
      return existing.id
    }
    const { data: created } = await supabase
      .from("contracts")
      .insert({
        project_id: project.id,
        client_id: null,
        number: null,
        status: "yangi",
        amount,
        exchange_rate: exchangeRate,
        auto_generated: true,
      })
      .select("id")
      .single()
    return created?.id ?? null
  }

  async function syncPaymentStages(projectId: string) {
    const contractId = await ensureContract({ id: projectId, budget: form.budget })
    if (!contractId) return
    const exchangeRate = form.exchange_rate && !isNaN(Number(form.exchange_rate)) ? Number(form.exchange_rate) : null
    const today = new Date().toISOString().slice(0, 10)
    const keepIds = new Set(stagesForm.filter((s) => s.id).map((s) => s.id))
    for (const orig of projectStages) {
      if (!keepIds.has(orig.id)) {
        await supabase.from("payment_stages").delete().eq("id", orig.id)
      }
    }
    for (let i = 0; i < stagesForm.length; i++) {
      const s = stagesForm[i]
      const original = s.id ? projectStages.find((p) => p.id === s.id) : undefined
      const wasPaid = original?.status === "tolandi"
      const amount = s.amount ? Number(s.amount) : 0
      const stagePayload = {
        contract_id: contractId,
        title: `${i + 1}-qism to'lovi`,
        amount,
        due_date: s.due_date || null,
        receipt_url: s.receipt_url || null,
        note: s.note || null,
        exchange_rate: exchangeRate,
        status: s.paid ? "tolandi" : "kutilmoqda",
        paid_at: s.paid ? (original?.paid_at ?? today) : null,
      }
      let stageId = s.id
      if (stageId) {
        await supabase.from("payment_stages").update(stagePayload).eq("id", stageId)
      } else {
        const { data: created } = await supabase.from("payment_stages").insert(stagePayload).select("id").single()
        stageId = created?.id
      }
      if (!stageId) continue
      if (s.paid && !wasPaid) {
        await markStagePaid({
          stageId, contractId, projectId,
          title: `${form.name} — ${i + 1}-qism`, amount,
          receiptUrl: s.receipt_url || null, note: s.note || null, exchangeRate,
        })
      } else if (!s.paid && wasPaid) {
        await markStageUnpaid(stageId)
      }
    }
  }

  // Live sync: checking/unchecking "To'landi" on an already-saved project
  // updates Finance immediately, without waiting for the whole form to be
  // submitted (mirrors syncPaymentStages' per-stage logic for the save path).
  async function togglePaid(i: number) {
    const s = stagesForm[i]
    const next = !s.paid
    if (!editing) {
      setStagesForm((arr) => arr.map((x, idx) => (idx === i ? { ...x, paid: next } : x)))
      return
    }
    if (!next) {
      if (s.id) await markStageUnpaid(s.id)
      setStagesForm((arr) => arr.map((x, idx) => (idx === i ? { ...x, paid: false } : x)))
      return
    }
    const contractId = await ensureContract({ id: editing.id, budget: form.budget })
    if (!contractId) return
    const exchangeRate = form.exchange_rate && !isNaN(Number(form.exchange_rate)) ? Number(form.exchange_rate) : null
    const amount = s.amount ? Number(s.amount) : 0
    const stagePayload = {
      contract_id: contractId,
      title: `${i + 1}-qism to'lovi`,
      amount,
      due_date: s.due_date || null,
      receipt_url: s.receipt_url || null,
      note: s.note || null,
      exchange_rate: exchangeRate,
    }
    let stageId = s.id
    if (stageId) {
      await supabase.from("payment_stages").update(stagePayload).eq("id", stageId)
    } else {
      const { data: created } = await supabase.from("payment_stages").insert(stagePayload).select("id").single()
      stageId = created?.id
    }
    if (!stageId) return
    await markStagePaid({
      stageId, contractId, projectId: editing.id,
      title: `${form.name} — ${i + 1}-qism`, amount,
      receiptUrl: s.receipt_url || null, note: s.note || null, exchangeRate,
    })
    setStagesForm((arr) => arr.map((x, idx) => (idx === i ? { ...x, id: stageId, paid: true } : x)))
    setProjectStages((prev) => [
      ...prev.filter((p) => p.id !== stageId),
      { id: stageId!, title: stagePayload.title, amount, due_date: stagePayload.due_date, contract_id: contractId, status: "tolandi", paid_at: new Date().toISOString().slice(0, 10), receipt_url: stagePayload.receipt_url, note: stagePayload.note, exchange_rate: exchangeRate },
    ])
  }

  async function remove(p: Project) {
    if (!confirm(`"${p.name}" loyihasini o‘chirishni tasdiqlaysizmi?`)) return
    await supabase.from("projects").delete().eq("id", p.id)
    load()
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const newStatus = String(over.id)
    const project = projects.find((p) => p.id === active.id)
    if (!project || project.status === newStatus) return
    setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, status: newStatus } : p)))
    await supabase.from("projects").update({ status: newStatus }).eq("id", project.id)
    if (newStatus === "jarayonda") await ensureContract(project)
  }

  async function generateKp() {
    if (!editing) return
    const { data: contract } = await supabase.from("contracts").select("id, amount").eq("project_id", editing.id).limit(1).maybeSingle()
    let stages: PaymentStage[] = []
    if (contract) {
      const { data } = await supabase.from("payment_stages").select("*").eq("contract_id", contract.id).order("due_date", { ascending: true })
      stages = (data as PaymentStage[]) ?? []
    }
    const html = renderProposalHtml({
      projectName: form.name,
      companyName: attachedLead?.company ?? null,
      clientContactName: form.client_contact_name || null,
      amount: contract?.amount ?? null,
      paymentType: form.payment_type || null,
      installmentsCount: form.payment_type === "bolib_tolash" ? Number(form.installments_count) : null,
      paymentStages: stages,
    })
    await supabase.from("proposals").insert({
      project_id: editing.id,
      kind: "kp",
      payment_type: form.payment_type || null,
      installments_count: form.payment_type === "bolib_tolash" ? Number(form.installments_count) : null,
      generated_html: html,
    })
    setKpHtml(html)
  }

  async function generateSupport(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const html = renderSupportHtml({
      projectName: form.name,
      companyName: attachedLead?.company ?? null,
      supportTier: supportForm.support_tier,
      supportMonths: Number(supportForm.support_months),
    })
    await supabase.from("proposals").insert({
      project_id: editing.id,
      kind: "support",
      support_tier: supportForm.support_tier,
      support_months: Number(supportForm.support_months),
      generated_html: html,
    })
    setSupportHtml(html)
  }

  const DOC_TYPES: { key: string; label: string }[] = [
    { key: "tz", label: "Texnik topshiriq" },
    { key: "payment_schedule", label: "To‘lov jadvali" },
    { key: "support_act", label: "Texnik qo‘llab-quvvatlash akti" },
    { key: "access_act", label: "Kirish ruxsatlari dalolatnomasi" },
    { key: "acceptance_act", label: "Ishlarni qabul qilish akti" },
    { key: "nda", label: "Maxfiylik kelishuvi" },
    { key: "change_request", label: "O‘zgarishlar so‘rovi formasi" },
  ]

  async function generateDoc(type: string, title: string) {
    if (!editing) return
    setDocHtml(null)
    setDocTitle(title)
    setDocOpen(true)
    const companyName = attachedLead?.company ?? null
    let html = ""
    if (type === "tz") {
      html = renderTzHtml({
        projectName: form.name,
        companyName,
        clientContactName: form.client_contact_name || null,
      })
    } else if (type === "payment_schedule") {
      const { data: contract } = await supabase.from("contracts").select("id, amount").eq("project_id", editing.id).limit(1).maybeSingle()
      let stages: PaymentStage[] = []
      if (contract) {
        const { data } = await supabase.from("payment_stages").select("*").eq("contract_id", contract.id).order("due_date", { ascending: true })
        stages = (data as PaymentStage[]) ?? []
      }
      html = renderPaymentScheduleHtml({
        projectName: form.name,
        companyName,
        totalAmount: contract?.amount ?? null,
        paymentStages: stages,
      })
    } else if (type === "support_act") {
      html = renderSupportActHtml({
        projectName: form.name,
        companyName,
        supportTier: supportForm.support_tier,
        supportMonths: Number(supportForm.support_months),
      })
    } else if (type === "access_act") {
      html = renderAccessActHtml({ projectName: form.name, companyName })
    } else if (type === "acceptance_act") {
      html = renderAcceptanceActHtml({ projectName: form.name, companyName, completedItems: [] })
    } else if (type === "nda") {
      html = renderNdaHtml({ projectName: form.name, companyName })
    } else if (type === "change_request") {
      html = renderChangeRequestHtml({ projectName: form.name, companyName, requestedBy: form.client_contact_name || null })
    }
    await supabase.from("document_templates").insert({ project_id: editing.id, doc_type: type, generated_html: html })
    setDocHtml(html)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Loyihalar</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Ustunlar orasida sudrab holatini o‘zgartiring</p>
        </div>
        <Button variant="accent" onClick={openNew}>
          <Plus size={15} /> Yangi loyiha
        </Button>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3.5 overflow-x-auto pb-4">
          {STATUSES.map((s) => (
            <Column key={s.key} status={s.key} label={s.label} tone={s.tone} count={projects.filter((p) => p.status === s.key).length}>
              {projects.filter((p) => p.status === s.key).map((p) => (
                <motion.div key={p.id} layout>
                  <ProjectCard p={p} onEdit={() => openEdit(p)} onDelete={() => remove(p)} />
                </motion.div>
              ))}
            </Column>
          ))}
        </div>
      </DndContext>

      <Dialog open={open} onOpenChange={setOpen} title={editing ? "Loyihani tahrirlash" : "Yangi loyiha"} className="max-w-2xl">
        <form onSubmit={save} className="space-y-3">
          <div>
            <Label>Nomi</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div>
            <Label>Lid biriktirish (telefon orqali)</Label>
            {attachedLead ? (
              <div className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>{attachedLead.client_name} {attachedLead.company ? `· ${attachedLead.company}` : ""}</span>
                  <button type="button" onClick={() => { setAttachedLead(null); setForm((f) => ({ ...f, lead_id: "" })) }} className="cursor-pointer text-xs text-[var(--color-danger)]">
                    Bekor qilish
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-[var(--color-ink-faint)]">
                  {attachedLead.phone && <span>Tel: {attachedLead.phone}</span>}
                  {attachedLead.source && <span>Manba: {attachedLead.source}</span>}
                  {attachedLead.region && <span>Viloyat: {attachedLead.region}</span>}
                  {attachedLead.business_type && <span>Biznes turi: {attachedLead.business_type}</span>}
                  {attachedLead.tier && <span>Tier: {attachedLead.tier}</span>}
                  {attachedLead.budget && <span>Byudjet (lid): {attachedLead.budget}</span>}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input value={leadPhoneSearch} onChange={(e) => setLeadPhoneSearch(e.target.value)} placeholder="+998..." />
                  <Button type="button" variant="outline" onClick={runLeadPhoneSearch}><Search size={14} /></Button>
                </div>
                {leadResults.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => attachLead(lead)}
                    className="block w-full cursor-pointer rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-2)]"
                  >
                    {lead.client_name} {lead.company ? `· ${lead.company}` : ""} {lead.phone ? `· ${lead.phone}` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mijoz vakili (kim bilan gaplashamiz)</Label>
              <Input value={form.client_contact_name} onChange={(e) => setForm({ ...form, client_contact_name: e.target.value })} />
            </div>
            <div>
              <Label>Xodimlar soni</Label>
              <Input type="number" value={form.employees_count} onChange={(e) => setForm({ ...form, employees_count: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Byudjet</Label>
              <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>
            <div>
              <Label>Kurs (1 USD = ? so'm)</Label>
              <Input type="number" value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })} placeholder="Masalan: 12700" />
            </div>
          </div>

          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">To‘lov shartlari</div>
              {editing && <span className="text-[10px] text-[var(--color-ink-faint)]">To'landi belgisi darhol Moliyaga yoziladi</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>To‘lov turi</Label>
                <Select
                  value={form.payment_type}
                  onChange={(e) => {
                    const val = e.target.value
                    setForm({ ...form, payment_type: val })
                    setStagesForm(val === "bolib_tolash" ? resizeStagesArray(stagesForm, Number(form.installments_count) || 2) : [])
                  }}
                >
                  <option value="bir_martalik">Bir martalik to‘lov</option>
                  <option value="bolib_tolash">Bo‘lib to‘lash</option>
                </Select>
              </div>
              {form.payment_type === "bolib_tolash" && (
                <div>
                  <Label>Necha qismga bo‘lib</Label>
                  <Input
                    type="number"
                    min={2}
                    value={form.installments_count}
                    onChange={(e) => {
                      const val = e.target.value
                      setForm({ ...form, installments_count: val })
                      setStagesForm(resizeStagesArray(stagesForm, Number(val) || 0))
                    }}
                  />
                </div>
              )}
            </div>

            {form.payment_type === "bolib_tolash" && stagesForm.length > 0 && (
              <div className="mt-3 space-y-2">
                {stagesForm.map((s, i) => (
                  <div key={i} className="rounded-[var(--radius-xs)] bg-[var(--color-surface-2)] p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-12 shrink-0 text-xs font-semibold text-[var(--color-ink-soft)]">{i + 1}-qism</span>
                      <Input
                        type="date"
                        className="w-40 shrink-0"
                        value={s.due_date}
                        onChange={(e) => setStagesForm((arr) => arr.map((x, idx) => (idx === i ? { ...x, due_date: e.target.value } : x)))}
                      />
                      <Input
                        type="number"
                        placeholder="Summa"
                        className="w-32 shrink-0"
                        value={s.amount}
                        onChange={(e) => setStagesForm((arr) => arr.map((x, idx) => (idx === i ? { ...x, amount: e.target.value } : x)))}
                      />
                      <Input
                        placeholder="Izoh"
                        className="flex-1"
                        value={s.note}
                        onChange={(e) => setStagesForm((arr) => arr.map((x, idx) => (idx === i ? { ...x, note: e.target.value } : x)))}
                      />
                      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs">
                        <Checkbox checked={s.paid} onCheckedChange={() => togglePaid(i)} />
                        To'landi
                      </label>
                    </div>
                    <div className="mt-2">
                      <FileUpload
                        folder="payment_receipts"
                        value={s.receipt_url}
                        onUploaded={(url) => setStagesForm((arr) => arr.map((x, idx) => (idx === i ? { ...x, receipt_url: url } : x)))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Boshlanish</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label>Tugash</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Holati</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Progress (%)</Label>
              <Input type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} />
              {tasksAvgProgress != null && (
                <button type="button" onClick={applyTaskProgress} className="mt-1 cursor-pointer text-xs text-[var(--color-accent)] hover:underline">
                  Vazifalardan hisoblangan: {tasksAvgProgress}% — qo'llash
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Rang</Label>
              <Select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
                {PROJECT_COLORS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>To'lovni kim qabul qiladi</Label>
              <Select value={form.billing_owner_id} onChange={(e) => setForm({ ...form, billing_owner_id: e.target.value })}>
                <option value="">Tanlanmagan</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <Label>Izoh</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>TZ fayli</Label>
            <FileUpload folder="tz" value={form.tz_file_url} onUploaded={(url) => setForm({ ...form, tz_file_url: url })} />
            {form.tz_file_url && (
              <a href={form.tz_file_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline">
                <Paperclip size={11} /> TZ faylini ko‘rish
              </a>
            )}
          </div>
          <Button type="submit" variant="accent" className="w-full">{editing ? "Saqlash" : "Qo‘shish"}</Button>
        </form>

        {editing && (
          <div className="mt-4 space-y-4 border-t border-[var(--color-border)] pt-4">
            <div className="flex justify-end">
              <HistoryButton entityType="project" entityId={editing.id} />
            </div>
            {projectTasks.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">Loyiha vazifalari</div>
                <div className="space-y-1.5">
                  {projectTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-[var(--radius-xs)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs">
                      <span>{t.title}</span>
                      <span className="text-[var(--color-ink-faint)]">{t.progress}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button type="button" variant="outline" className="w-full" onClick={async () => { setKpHtml(null); setKpOpen(true); await generateKp() }}>
              <FileText size={14} /> KP (kommersiya taklifi) yaratish
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => { setSupportHtml(null); setSupportOpen(true) }}>
              <FileText size={14} /> Qo‘llab-quvvatlash hujjatini yaratish
            </Button>
            <div className="grid grid-cols-2 gap-2">
              {DOC_TYPES.map((d) => (
                <Button key={d.key} type="button" variant="outline" className="w-full" onClick={() => generateDoc(d.key, d.label)}>
                  <FileText size={14} /> {d.label}
                </Button>
              ))}
            </div>
            <Comments entityType="project" entityId={editing.id} />
          </div>
        )}
      </Dialog>

      <Dialog open={kpOpen} onOpenChange={setKpOpen} title="KP (kommersiya taklifi)">
        {kpHtml && (
          <div className="space-y-3">
            <div className="max-h-[60vh] overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border)]" dangerouslySetInnerHTML={{ __html: kpHtml }} />
            <Button variant="outline" className="w-full" onClick={() => window.print()}>Chop etish / PDF saqlash</Button>
          </div>
        )}
      </Dialog>

      <Dialog open={supportOpen} onOpenChange={setSupportOpen} title="Qo‘llab-quvvatlash hujjati">
        {!supportHtml ? (
          <form onSubmit={generateSupport} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tarif</Label>
                <Select value={supportForm.support_tier} onChange={(e) => setSupportForm({ ...supportForm, support_tier: e.target.value })}>
                  <option value="bepul">Bepul</option>
                  <option value="start">Start</option>
                  <option value="pro">Pro</option>
                  <option value="max">Max</option>
                </Select>
              </div>
              <div>
                <Label>Necha oy</Label>
                <Input type="number" min={0} value={supportForm.support_months} onChange={(e) => setSupportForm({ ...supportForm, support_months: e.target.value })} />
              </div>
            </div>
            <Button type="submit" variant="accent" className="w-full">Yaratish</Button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="max-h-[60vh] overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border)]" dangerouslySetInnerHTML={{ __html: supportHtml }} />
            <Button variant="outline" className="w-full" onClick={() => window.print()}>Chop etish / PDF saqlash</Button>
          </div>
        )}
      </Dialog>

      <Dialog open={docOpen} onOpenChange={setDocOpen} title={docTitle} className="max-w-4xl">
        {docHtml && (
          <div className="space-y-3">
            <div className="max-h-[65vh] overflow-auto rounded-[var(--radius-sm)] border border-[var(--color-border)]" dangerouslySetInnerHTML={{ __html: docHtml }} />
            <Button variant="outline" className="w-full" onClick={() => window.print()}>Chop etish / PDF saqlash</Button>
          </div>
        )}
      </Dialog>
    </div>
  )
}
