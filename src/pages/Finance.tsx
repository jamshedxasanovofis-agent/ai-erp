import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input, Label, Select } from "@/components/ui/Input"
import { FileUpload } from "@/components/ui/FileUpload"
import { Progress } from "@/components/ui/Progress"
import { Badge } from "@/components/ui/Badge"
import { Tabs } from "@/components/ui/Tabs"
import { HistoryButton } from "@/components/ui/HistoryPanel"
import { logFieldChanges, logDeletion, fetchDeletionHistory, type FieldHistoryEntry } from "@/lib/history"
import { markStagePaid, markStageUnpaid } from "@/lib/paymentSync"
import { formatMoney, formatDate, formatDateTime } from "@/lib/utils"
import { Plus, TrendingUp, TrendingDown, Target, CalendarClock, Check, Pencil, Trash2, Calculator, TrendingDown as LostIcon, Paperclip, X, Wallet } from "lucide-react"
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, YAxis } from "recharts"

type Tx = {
  id: string; type: "kirim" | "chiqim"; category: string | null; amount: number; occurred_on: string
  receipt_url: string | null; edited_at: string | null; currency: string; expense_category: string | null
  exchange_rate: number | null
}
type Goal = { id: string; title: string; target_amount: number; period_start: string; period_end: string; target_leads: number | null }
type PaymentStage = {
  id: string; contract_id: string; title: string; amount: number; due_date: string | null; status: string; paid_at: string | null
  receipt_url: string | null; note: string | null; exchange_rate: number | null
  contracts?: { number: string | null; project_id: string | null } | null
}
type ContractOption = { id: string; number: string | null }
type LostLead = { amount: number | null; rejection_note: string | null; pipeline_stage: string | null }
type ProfileOption = { id: string; full_name: string; salary: number | null }
type SalaryPayment = {
  id: string; profile_id: string; period_month: string; amount: number; currency: string
  exchange_rate: number | null; finance_transaction_id: string | null; note: string | null
}

const TX_FIELD_LABELS: Record<string, string> = {
  type: "Turi", category: "Kategoriya", amount: "Summa", occurred_on: "Sana", expense_category: "Xarajat toifasi",
}

const EXPENSE_CATEGORIES = [
  { key: "ish_haqi", label: "Ish haqi" },
  { key: "ijara", label: "Ijara" },
  { key: "kommunal", label: "Kommunal" },
  { key: "server_hosting", label: "Server / Hosting" },
  { key: "ofis", label: "Ofis xarajatlari" },
  { key: "reklama", label: "Reklama va marketing" },
  { key: "buxgalteriya_yuridik", label: "Buxgalteriya / Yuridik" },
  { key: "amortizatsiya", label: "Amortizatsiya" },
  { key: "reinvestitsiya", label: "Reinvestitsiya" },
  { key: "soliq", label: "Soliq" },
  { key: "boshqa", label: "Boshqa" },
]

const REJECTION_LABEL: Record<string, string> = {
  qimmat: "Qimmat", qiziqdi: "Faqat qiziqdi", qaror_qabul_qiluvchi_emas: "Qaror qabul qiluvchi emas",
  sifatsiz_lid: "Sifatsiz lid", arxiv: "Arxiv", boshqa: "Boshqa",
}

const SCENARIOS = {
  pess: { cr1: 3, cr2: 40, cr3: 35, cr4: 10, label: "Pessimistik" },
  real: { cr1: 8, cr2: 60, cr3: 55, cr4: 20, label: "Realistik" },
  opt: { cr1: 15, cr2: 75, cr3: 70, cr4: 35, label: "Optimistik" },
}

function FunnelCalculator({ onSaveGoal }: { onSaveGoal: (g: { target: number; leads: number; avgDeal: number; cr4: number }) => void }) {
  const [scenario, setScenario] = useState<"pess" | "real" | "opt">("real")
  const [target, setTarget] = useState(10000)
  const [avgDeal, setAvgDeal] = useState(650)
  const [mktPct, setMktPct] = useState(20)
  const [salesCost, setSalesCost] = useState(800)
  const [opsCost, setOpsCost] = useState(300)

  const cr = SCENARIOS[scenario]
  const deals = Math.ceil(target / avgDeal)
  const demos = Math.ceil(deals / (cr.cr4 / 100))
  const meet = Math.ceil(demos / (cr.cr3 / 100))
  const leads = Math.ceil(meet / (cr.cr2 / 100))
  const traffic = Math.ceil(leads / (cr.cr1 / 100))
  const mktBudget = target * (mktPct / 100)
  const totalCost = mktBudget + salesCost + opsCost
  const profit = target - totalCost
  const cac = deals > 0 ? totalCost / deals : 0
  const cpl = leads > 0 ? mktBudget / leads : 0

  return (
    <div className="space-y-4">
      <div>
        <Label>Stsenariy</Label>
        <Tabs
          value={scenario}
          onChange={setScenario}
          options={[
            { value: "pess", label: SCENARIOS.pess.label },
            { value: "real", label: SCENARIOS.real.label },
            { value: "opt", label: SCENARIOS.opt.label },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Oylik maqsad daromad ($)</Label>
          <Input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} />
        </div>
        <div>
          <Label>O'rtacha chek ($)</Label>
          <Input type="number" value={avgDeal} onChange={(e) => setAvgDeal(Number(e.target.value))} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Marketing byudjeti (%)</Label>
          <Input type="number" value={mktPct} onChange={(e) => setMktPct(Number(e.target.value))} />
        </div>
        <div>
          <Label>Sotuv jamoasi ($/oy)</Label>
          <Input type="number" value={salesCost} onChange={(e) => setSalesCost(Number(e.target.value))} />
        </div>
        <div>
          <Label>Operatsion xarajat ($/oy)</Label>
          <Input type="number" value={opsCost} onChange={(e) => setOpsCost(Number(e.target.value))} />
        </div>
      </div>

      <div className="text-xs text-[var(--color-ink-faint)]">
        Trafik→Lead: {cr.cr1}% · Lead→Uchrashuv: {cr.cr2}% · Uchrashuv→Demo: {cr.cr3}% · Demo→Shartnoma: {cr.cr4}%
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
          <div className="text-[10px] uppercase tracking-wide text-[var(--color-ink-faint)]">Kerakli shartnoma</div>
          <div className="text-lg font-semibold text-[var(--color-accent)]">{deals}</div>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
          <div className="text-[10px] uppercase tracking-wide text-[var(--color-ink-faint)]">Kerakli demo</div>
          <div className="text-lg font-semibold text-[var(--color-success)]">{demos}</div>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
          <div className="text-[10px] uppercase tracking-wide text-[var(--color-ink-faint)]">Kerakli lead</div>
          <div className="text-lg font-semibold text-[var(--color-warning)]">{leads}</div>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
          <div className="text-[10px] uppercase tracking-wide text-[var(--color-ink-faint)]">Kerakli trafik</div>
          <div className="text-lg font-semibold text-[var(--color-danger)]">{traffic}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
        <div><span className="text-[var(--color-ink-faint)]">CAC: </span><span className="font-medium">${cac.toFixed(0)}</span></div>
        <div><span className="text-[var(--color-ink-faint)]">CPL: </span><span className="font-medium">${cpl.toFixed(0)}</span></div>
        <div><span className="text-[var(--color-ink-faint)]">Marketing: </span><span className="font-medium">${mktBudget.toFixed(0)}</span></div>
        <div><span className="text-[var(--color-ink-faint)]">Sof foyda: </span><span className={`font-medium ${profit >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>${profit.toFixed(0)}</span></div>
      </div>

      <Button type="button" variant="accent" className="w-full" onClick={() => onSaveGoal({ target, leads, avgDeal, cr4: cr.cr4 })}>
        Bu maqsadni SMART maqsad sifatida saqlash
      </Button>
    </div>
  )
}

export default function Finance() {
  const [txs, setTxs] = useState<Tx[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [expectedContracts, setExpectedContracts] = useState(0)
  const [hypothesisAmount, setHypothesisAmount] = useState(0)
  const [lostLeads, setLostLeads] = useState<LostLead[]>([])
  const [usdRate, setUsdRate] = useState<number | null>(null)
  const [currency, setCurrency] = useState<"UZS" | "USD">("UZS")
  const [open, setOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Tx | null>(null)
  const [goalOpen, setGoalOpen] = useState(false)
  const [stageOpen, setStageOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const [form, setForm] = useState({ type: "kirim", category: "", amount: "", occurred_on: "", receipt_url: "", expense_category: "" })
  const [goalForm, setGoalForm] = useState({ title: "", target_amount: "", period_start: "", period_end: "" })
  const [stages, setStages] = useState<PaymentStage[]>([])
  const [contractOptions, setContractOptions] = useState<ContractOption[]>([])
  const [stageForm, setStageForm] = useState({ contract_id: "", title: "", amount: "", due_date: "" })
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [deletedTxs, setDeletedTxs] = useState<FieldHistoryEntry[]>([])
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([])
  const [salaryOpen, setSalaryOpen] = useState(false)
  const [salaryForm, setSalaryForm] = useState({ profile_id: "", period_month: "", amount: "", finance_transaction_id: "", note: "" })

  async function load() {
    const [{ data: t }, { data: g }, { data: c }, { data: st }, { data: co }, { data: hyp }, { data: lost }, { data: rate }, { data: pr }, { data: sal }] = await Promise.all([
      supabase.from("finance_transactions").select("*").order("occurred_on", { ascending: false }).limit(200),
      supabase.from("finance_goals").select("*").order("period_start", { ascending: false }),
      supabase.from("contracts").select("amount").in("status", ["yangi", "kutilmoqda"]),
      supabase.from("payment_stages").select("*, contracts(number, project_id)").order("due_date", { ascending: true }),
      supabase.from("contracts").select("id, number"),
      supabase.from("leads").select("amount").in("stage", ["potensial_mijoz", "lead", "birinchi_uchrashuv", "qayta_aloqa", "kp_berish", "etirozlar", "ikkinchi_uchrashuv", "demo_berish"]),
      supabase.from("leads").select("amount, rejection_note, pipeline_stage").eq("stage", "yoqotildi"),
      supabase.from("exchange_rates").select("usd_to_uzs").order("rate_date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("profiles").select("id, full_name, salary"),
      supabase.from("salary_payments").select("*").order("period_month", { ascending: false }),
    ])
    setTxs((t as Tx[]) ?? [])
    setGoals((g as Goal[]) ?? [])
    setExpectedContracts((c ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0))
    setStages((st as any) ?? [])
    setContractOptions((co as ContractOption[]) ?? [])
    setHypothesisAmount((hyp ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0))
    setLostLeads((lost as LostLead[]) ?? [])
    setUsdRate(rate?.usd_to_uzs ?? null)
    setProfiles((pr as ProfileOption[]) ?? [])
    setSalaryPayments((sal as SalaryPayment[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  function convert(amountUzs: number) {
    if (currency === "UZS" || !usdRate) return amountUzs
    return amountUzs / usdRate
  }
  function money(amountInStoredCurrency: number, sourceCurrency: "UZS" | "USD" = "UZS") {
    let uzs = amountInStoredCurrency
    if (sourceCurrency === "USD" && usdRate) uzs = amountInStoredCurrency * usdRate
    return formatMoney(convert(uzs), currency)
  }

  const income = txs.filter((t) => t.type === "kirim").reduce((s, t) => s + Number(t.amount), 0)
  const expense = txs.filter((t) => t.type === "chiqim").reduce((s, t) => s + Number(t.amount), 0)
  const net = income - expense
  const lostTotal = lostLeads.reduce((s, l) => s + Number(l.amount || 0), 0)

  const lostByReason = useMemo(() => {
    const map: Record<string, number> = {}
    for (const l of lostLeads) {
      const key = l.pipeline_stage ?? "boshqa"
      map[key] = (map[key] ?? 0) + Number(l.amount || 0)
    }
    return Object.entries(map).map(([key, amount]) => ({ key, label: REJECTION_LABEL[key] ?? key, amount }))
  }, [lostLeads])

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of txs) {
      if (t.type !== "chiqim") continue
      const key = t.expense_category ?? "boshqa"
      map[key] = (map[key] ?? 0) + Number(t.amount)
    }
    return EXPENSE_CATEGORIES.map((c) => ({ category: c.label, amount: map[c.key] ?? 0 })).filter((r) => r.amount > 0)
  }, [txs])

  const chartData = useMemo(() => {
    const byMonth: Record<string, { month: string; kirim: number; chiqim: number }> = {}
    for (const t of txs) {
      const m = t.occurred_on?.slice(0, 7) ?? "—"
      byMonth[m] ??= { month: m, kirim: 0, chiqim: 0 }
      byMonth[m][t.type === "kirim" ? "kirim" : "chiqim"] += Number(t.amount)
    }
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month))
  }, [txs])

  function openNewTx() {
    setEditingTx(null)
    setForm({ type: "kirim", category: "", amount: "", occurred_on: "", receipt_url: "", expense_category: "" })
    setOpen(true)
  }
  function openEditTx(tx: Tx) {
    setEditingTx(tx)
    setForm({ type: tx.type, category: tx.category ?? "", amount: String(tx.amount), occurred_on: tx.occurred_on, receipt_url: tx.receipt_url ?? "", expense_category: tx.expense_category ?? "" })
    setOpen(true)
  }

  async function addTx(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      type: form.type,
      category: form.category || null,
      amount: Number(form.amount),
      occurred_on: form.occurred_on || new Date().toISOString().slice(0, 10),
      receipt_url: form.receipt_url || null,
      expense_category: form.type === "chiqim" ? form.expense_category || null : null,
    }
    if (editingTx) {
      await supabase.from("finance_transactions").update({ ...payload, edited_at: new Date().toISOString() }).eq("id", editingTx.id)
      await logFieldChanges("finance_transaction", editingTx.id, editingTx, { ...editingTx, ...payload }, TX_FIELD_LABELS)
    } else {
      await supabase.from("finance_transactions").insert(payload)
    }
    setForm({ type: "kirim", category: "", amount: "", occurred_on: "", receipt_url: "", expense_category: "" })
    setEditingTx(null)
    setOpen(false)
    load()
  }

  async function removeTx(tx: Tx) {
    if (!confirm(`"${tx.category || (tx.type === "kirim" ? "Kirim" : "Chiqim")}" tranzaksiyasini o'chirishni tasdiqlaysizmi?`)) return
    await logDeletion("finance_transaction", tx.id, tx)
    await supabase.from("finance_transactions").delete().eq("id", tx.id)
    load()
  }

  async function openDeletedHistory() {
    setDeletedTxs(await fetchDeletionHistory("finance_transaction"))
    setDeletedOpen(true)
  }

  async function addGoal(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from("finance_goals").insert({
      title: goalForm.title,
      target_amount: Number(goalForm.target_amount),
      period_start: goalForm.period_start,
      period_end: goalForm.period_end,
    })
    setGoalForm({ title: "", target_amount: "", period_start: "", period_end: "" })
    setGoalOpen(false)
    load()
  }

  async function saveCalculatorGoal(g: { target: number; leads: number; avgDeal: number; cr4: number }) {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
    await supabase.from("finance_goals").insert({
      title: `Voronka kalkulyatori — ${now.toLocaleString("uz-UZ", { month: "long" })}`,
      target_amount: g.target,
      target_leads: g.leads,
      avg_deal: g.avgDeal,
      conversion_rate_pct: g.cr4,
      period_start: start,
      period_end: end,
    })
    setCalcOpen(false)
    load()
  }

  async function addStage(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from("payment_stages").insert({
      contract_id: stageForm.contract_id,
      title: stageForm.title,
      amount: Number(stageForm.amount),
      due_date: stageForm.due_date || null,
    })
    setStageForm({ contract_id: "", title: "", amount: "", due_date: "" })
    setStageOpen(false)
    load()
  }

  async function markPaid(stage: PaymentStage) {
    await markStagePaid({
      stageId: stage.id, contractId: stage.contract_id, projectId: stage.contracts?.project_id ?? null,
      title: `To'lov bosqichi: ${stage.title}`, amount: stage.amount,
      receiptUrl: stage.receipt_url, note: stage.note, exchangeRate: stage.exchange_rate,
    })
    load()
  }

  async function cancelPaid(stage: PaymentStage) {
    if (!confirm("To'lovni bekor qilishni tasdiqlaysizmi? Bog'liq tranzaksiya o'chiriladi.")) return
    await markStageUnpaid(stage.id)
    load()
  }

  async function addSalaryPayment(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from("salary_payments").insert({
      profile_id: salaryForm.profile_id,
      period_month: salaryForm.period_month,
      amount: Number(salaryForm.amount),
      finance_transaction_id: salaryForm.finance_transaction_id || null,
      note: salaryForm.note || null,
    })
    setSalaryForm({ profile_id: "", period_month: "", amount: "", finance_transaction_id: "", note: "" })
    setSalaryOpen(false)
    load()
  }

  const isOverdue = (s: PaymentStage) => s.status !== "tolandi" && s.due_date && s.due_date < new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Moliya</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Fin model, SMART maqsadlar va oqim</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tabs value={currency} onChange={setCurrency} options={[{ value: "UZS", label: "So'm" }, { value: "USD", label: "USD" }]} />
          <Button variant="outline" onClick={() => setCalcOpen(true)}>
            <Calculator size={15} /> Voronka kalkulyatori
          </Button>
          <Button variant="outline" onClick={() => setGoalOpen(true)}>
            <Target size={15} /> SMART maqsad
          </Button>
          <Button variant="outline" onClick={() => setSalaryOpen(true)}>
            <Wallet size={15} /> Ish haqi
          </Button>
          <Button variant="outline" onClick={openDeletedHistory}>
            <Trash2 size={15} /> O'chirilganlar
          </Button>
          <Button variant="accent" onClick={openNewTx}>
            <Plus size={15} /> Tranzaksiya
          </Button>
        </div>
      </div>

      {!usdRate && currency === "USD" && (
        <p className="text-xs text-[var(--color-warning)]">Kurs kiritilmagan — summalar hozircha so'mda ko'rsatilmoqda. Kurs kiritish uchun SQL orqali <code>exchange_rates</code> jadvaliga yozing.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-5">
          <div className="mb-2 flex items-center gap-2 text-[var(--color-success)]"><TrendingUp size={16} /><span className="text-xs font-medium">Kirim</span></div>
          <div className="text-xl font-semibold">{money(income)}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <div className="mb-2 flex items-center gap-2 text-[var(--color-danger)]"><TrendingDown size={16} /><span className="text-xs font-medium">Chiqim</span></div>
          <div className="text-xl font-semibold">{money(expense)}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <div className="mb-2 text-xs font-medium text-[var(--color-ink-soft)]">Sof foyda</div>
          <div className={`text-xl font-semibold ${net >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{money(net)}</div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Real vs Gipoteza</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div>
              <div className="text-xs text-[var(--color-ink-soft)]">Real (imzolangan shartnomalar)</div>
              <div className="text-lg font-semibold text-[var(--color-success)]">{money(expectedContracts)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--color-ink-soft)]">Gipoteza (jarayondagi lidlar summasi)</div>
              <div className="text-lg font-semibold text-[var(--color-accent)]">{money(hypothesisAmount)}</div>
              <div className="text-[11px] text-[var(--color-ink-faint)]">Agar hozirgi voronkadagi barcha lidlar yopilsa — mumkin bo'lgan qo'shimcha daromad</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><LostIcon size={14} className="text-[var(--color-danger)]" /> Yo'qotilgan imkoniyat</CardTitle></CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="text-lg font-semibold text-[var(--color-danger)]">{money(lostTotal)}</div>
            <div className="text-[11px] text-[var(--color-ink-faint)]">Rad etilgan lidlarning umumiy summasi — sabab bo'yicha</div>
            {lostByReason.map((r) => (
              <div key={r.key} className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-ink-soft)]">{r.label}</span>
                <span className="font-medium">{money(r.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {expenseByCategory.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Xarajatlar kategoriya bo'yicha</CardTitle></CardHeader>
          <CardContent className="h-56 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseByCategory} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={140} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 12 }} formatter={(v) => money(Number(v))} />
                <Bar dataKey="amount" fill="var(--color-danger)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Barcha tranzaksiyalar</CardTitle></CardHeader>
        <CardContent className="space-y-2 pt-0">
          {txs.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm">
              <div className="flex items-center gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${t.type === "kirim" ? "bg-[var(--color-success-soft)] text-[var(--color-success)]" : "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"}`}>
                  {t.type === "kirim" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                </span>
                <div>
                  <div className="font-medium">{t.category || (t.type === "kirim" ? "Kirim" : "Chiqim")}</div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-faint)]">
                    {formatDate(t.occurred_on)}
                    {t.expense_category && <Badge tone="neutral">{EXPENSE_CATEGORIES.find((c) => c.key === t.expense_category)?.label}</Badge>}
                    {t.exchange_rate && <Badge tone="neutral">Kurs: {t.exchange_rate}</Badge>}
                    {t.edited_at && <HistoryButton entityType="finance_transaction" entityId={t.id} label="Tahrirlangan" />}
                    {salaryPayments.some((s) => s.finance_transaction_id === t.id) && (
                      <Badge tone="accent">
                        Ish haqi: {salaryPayments.filter((s) => s.finance_transaction_id === t.id).map((s) => profiles.find((p) => p.id === s.profile_id)?.full_name).filter(Boolean).join(", ")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-medium ${t.type === "kirim" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{money(t.amount)}</span>
                <button onClick={() => openEditTx(t)} className="cursor-pointer rounded p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]">
                  <Pencil size={13} />
                </button>
                <button onClick={() => removeTx(t)} className="cursor-pointer rounded p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          {txs.length === 0 && <p className="text-xs text-[var(--color-ink-faint)]">Hozircha tranzaksiyalar yo'q.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Oylik oqim (grafik)</CardTitle></CardHeader>
        <CardContent className="h-56 pt-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="kirim" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="chiqim" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-danger)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-danger)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 12 }} />
              <Area type="monotone" dataKey="kirim" stroke="var(--color-success)" fill="url(#kirim)" strokeWidth={2} />
              <Area type="monotone" dataKey="chiqim" stroke="var(--color-danger)" fill="url(#chiqim)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>To'lov bosqichlari</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setStageOpen(true)}>
            <Plus size={13} /> Bosqich qo'shish
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {stages.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm">
              <div>
                <div className="font-medium">{s.title} <span className="text-xs text-[var(--color-ink-faint)]">· {s.contracts?.number ?? "shartnomasiz"}</span></div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-ink-faint)]">
                  <CalendarClock size={11} /> {s.due_date ? formatDate(s.due_date) : "muddatsiz"} · {money(s.amount)}
                  {s.exchange_rate && <span>· Kurs: {s.exchange_rate}</span>}
                  {s.receipt_url && (
                    <a href={s.receipt_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[var(--color-accent)] hover:underline">
                      <Paperclip size={11} /> Chek
                    </a>
                  )}
                  {s.note && <span className="italic">· {s.note}</span>}
                </div>
              </div>
              {s.status === "tolandi" ? (
                <div className="flex items-center gap-2">
                  <Badge tone="success">To'landi</Badge>
                  <button onClick={() => cancelPaid(s)} title="To'lovni bekor qilish" className="cursor-pointer rounded p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]">
                    <X size={13} />
                  </button>
                </div>
              ) : isOverdue(s) ? (
                <div className="flex items-center gap-2">
                  <Badge tone="danger">Muddati o'tgan</Badge>
                  <Button size="sm" variant="outline" onClick={() => markPaid(s)}><Check size={12} /> To'landi</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => markPaid(s)}>
                  <Check size={12} /> To'landi deb belgilash
                </Button>
              )}
            </div>
          ))}
          {stages.length === 0 && <p className="text-xs text-[var(--color-ink-faint)]">Hozircha to'lov bosqichlari yo'q.</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {goals.map((g) => {
          const achieved = txs
            .filter((t) => t.type === "kirim" && t.occurred_on >= g.period_start && t.occurred_on <= g.period_end)
            .reduce((s, t) => s + Number(t.amount), 0)
          const pct = g.target_amount ? Math.min(100, Math.round((achieved / g.target_amount) * 100)) : 0
          return (
            <Card key={g.id}>
              <CardContent className="pt-5">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="font-medium">{g.title}</h4>
                  <span className="text-xs text-[var(--color-ink-faint)]">{formatDate(g.period_start)} – {formatDate(g.period_end)}</span>
                </div>
                <Progress value={pct} tone={pct >= 100 ? "success" : "accent"} className="my-2" />
                <div className="text-xs text-[var(--color-ink-soft)]">{money(achieved)} / {money(g.target_amount)} ({pct}%)</div>
                {g.target_leads != null && (
                  <div className="mt-1 text-[11px] text-[var(--color-ink-faint)]">Kerakli lead: {g.target_leads}</div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen} title={editingTx ? "Tranzaksiyani tahrirlash" : "Yangi tranzaksiya"}>
        <form onSubmit={addTx} className="space-y-3">
          <div>
            <Label>Turi</Label>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="kirim">Kirim</option>
              <option value="chiqim">Chiqim</option>
            </Select>
          </div>
          <div>
            <Label>Kategoriya (izoh)</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          {form.type === "chiqim" && (
            <div>
              <Label>Xarajat toifasi</Label>
              <Select value={form.expense_category} onChange={(e) => setForm({ ...form, expense_category: e.target.value })}>
                <option value="">—</option>
                {EXPENSE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Summa (so'm)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <Label>Sana</Label>
              <Input type="date" value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Chek / kvitansiya</Label>
            <FileUpload folder="receipts" value={form.receipt_url} onUploaded={(url) => setForm({ ...form, receipt_url: url })} />
          </div>
          <Button type="submit" variant="accent" className="w-full">{editingTx ? "Saqlash" : "Qo'shish"}</Button>
        </form>
      </Dialog>

      <Dialog open={goalOpen} onOpenChange={setGoalOpen} title="SMART maqsad qo'shish">
        <form onSubmit={addGoal} className="space-y-3">
          <div>
            <Label>Nomi</Label>
            <Input value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} required />
          </div>
          <div>
            <Label>Maqsad summasi</Label>
            <Input type="number" value={goalForm.target_amount} onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Boshlanish</Label>
              <Input type="date" value={goalForm.period_start} onChange={(e) => setGoalForm({ ...goalForm, period_start: e.target.value })} required />
            </div>
            <div>
              <Label>Tugash</Label>
              <Input type="date" value={goalForm.period_end} onChange={(e) => setGoalForm({ ...goalForm, period_end: e.target.value })} required />
            </div>
          </div>
          <Button type="submit" variant="accent" className="w-full">Qo'shish</Button>
        </form>
      </Dialog>

      <Dialog open={stageOpen} onOpenChange={setStageOpen} title="To'lov bosqichi qo'shish">
        <form onSubmit={addStage} className="space-y-3">
          <div>
            <Label>Shartnoma</Label>
            <Select value={stageForm.contract_id} onChange={(e) => setStageForm({ ...stageForm, contract_id: e.target.value })} required>
              <option value="">Tanlang</option>
              {contractOptions.map((c) => <option key={c.id} value={c.id}>{c.number || c.id.slice(0, 8)}</option>)}
            </Select>
          </div>
          <div>
            <Label>Bosqich nomi</Label>
            <Input value={stageForm.title} onChange={(e) => setStageForm({ ...stageForm, title: e.target.value })} placeholder="Boshlang'ich to'lov" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Summa</Label>
              <Input type="number" value={stageForm.amount} onChange={(e) => setStageForm({ ...stageForm, amount: e.target.value })} required />
            </div>
            <div>
              <Label>Muddat</Label>
              <Input type="date" value={stageForm.due_date} onChange={(e) => setStageForm({ ...stageForm, due_date: e.target.value })} />
            </div>
          </div>
          <Button type="submit" variant="accent" className="w-full">Qo'shish</Button>
        </form>
      </Dialog>

      <Dialog open={calcOpen} onOpenChange={setCalcOpen} title="Voronka kalkulyatori" className="max-w-2xl">
        <FunnelCalculator onSaveGoal={saveCalculatorGoal} />
      </Dialog>

      <Dialog open={deletedOpen} onOpenChange={setDeletedOpen} title="O'chirilgan tranzaksiyalar tarixi">
        <div className="space-y-2">
          {deletedTxs.map((e) => {
            let snap: Partial<Tx> = {}
            try { snap = e.old_value ? JSON.parse(e.old_value) : {} } catch { /* ignore malformed snapshot */ }
            return (
              <div key={e.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{snap.category || (snap.type === "kirim" ? "Kirim" : "Chiqim")}</span>
                  <span className={snap.type === "kirim" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}>
                    {snap.amount != null ? money(Number(snap.amount)) : "—"}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-[var(--color-ink-faint)]">O'chirildi: {formatDateTime(e.created_at)}</div>
              </div>
            )
          })}
          {deletedTxs.length === 0 && <p className="text-xs text-[var(--color-ink-faint)]">Hozircha o'chirilgan tranzaksiyalar yo'q.</p>}
        </div>
      </Dialog>

      <Dialog open={salaryOpen} onOpenChange={setSalaryOpen} title="Ish haqi" className="max-w-2xl">
        <div className="space-y-4">
          <form onSubmit={addSalaryPayment} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Xodim</Label>
                <Select value={salaryForm.profile_id} onChange={(e) => setSalaryForm({ ...salaryForm, profile_id: e.target.value })} required>
                  <option value="">Tanlang</option>
                  {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Oy</Label>
                <Input type="month" value={salaryForm.period_month ? salaryForm.period_month.slice(0, 7) : ""} onChange={(e) => setSalaryForm({ ...salaryForm, period_month: e.target.value ? `${e.target.value}-01` : "" })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Summa</Label>
                <Input type="number" value={salaryForm.amount} onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })} required />
              </div>
              <div>
                <Label>Qaysi kirimdan (ixtiyoriy)</Label>
                <Select value={salaryForm.finance_transaction_id} onChange={(e) => setSalaryForm({ ...salaryForm, finance_transaction_id: e.target.value })}>
                  <option value="">—</option>
                  {txs.filter((t) => t.type === "kirim").map((t) => (
                    <option key={t.id} value={t.id}>{t.category || "Kirim"} · {money(t.amount)} · {formatDate(t.occurred_on)}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label>Izoh</Label>
              <Input value={salaryForm.note} onChange={(e) => setSalaryForm({ ...salaryForm, note: e.target.value })} />
            </div>
            <Button type="submit" variant="accent" className="w-full">Qo'shish</Button>
          </form>

          <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
            {profiles.map((p) => {
              const payments = salaryPayments.filter((s) => s.profile_id === p.id)
              if (payments.length === 0) return null
              return (
                <div key={p.id}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">{p.full_name}</div>
                  {payments.map((s) => {
                    const linkedTx = txs.find((t) => t.id === s.finance_transaction_id)
                    return (
                      <div key={s.id} className="mt-1 flex items-center justify-between rounded-[var(--radius-xs)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs">
                        <span>{s.period_month.slice(0, 7)} {s.note && `· ${s.note}`} {linkedTx && `· ${linkedTx.category || "Kirim"}dan`}</span>
                        <span className="font-medium">{money(s.amount)}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {salaryPayments.length === 0 && <p className="text-xs text-[var(--color-ink-faint)]">Hozircha ish haqi to'lovlari yo'q.</p>}
          </div>
        </div>
      </Dialog>
    </div>
  )
}
