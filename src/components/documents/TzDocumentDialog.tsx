import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Dialog } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import {
  emptyTzData, renderTzDocHtml, COMPANY_NAME, COMPANY_TAGLINE, todayUzDate,
  INK, MUTED, FAINT, LINE, HEAD_BG, FONT, type TzData,
} from "@/lib/aiIntegratorDocs"
import { BUSINESS_TYPES } from "@/lib/crmConstants"
import { KIRMAYDIGAN_ISHLAR_DEFAULT } from "@/lib/tzPresets"
import { downloadDocPdf } from "@/lib/pdfExport"
import { fixUzbekGrammar, fixAllStringsDeep } from "@/lib/grammarFix"
import { Plus, Trash2, Lightbulb, Printer } from "lucide-react"

// --- tiny editing primitives — every editable slot gets a clearly visible
// tinted box (green = adaptable-with-suggestions, blue = adaptable-default),
// so it's always obvious where you can click and type, distinct from the
// static template text around it. ---

const TONE_BG = { green: "#eefaf1", blue: "#eaf3fc" }
const TONE_BORDER = { green: "#b9e6c4", blue: "#bcdcf7" }

// Auto-corrects O'zbek apostrophe/orthography (o', g') on blur, and tracks
// whether the last correction actually changed anything so the field can
// show a small "AI tuzatildi" badge — editor-only, never part of the
// generated document (renderTzDocHtml doesn't know this state exists).
function useGrammarFixOnBlur(value: string, onChange: (v: string) => void) {
  const correctingRef = useRef<string | null>(null)
  const [corrected, setCorrected] = useState(false)
  return {
    corrected,
    onChange: (v: string) => { correctingRef.current = null; setCorrected(false); onChange(v) },
    onBlur: async () => {
      const original = value
      correctingRef.current = original
      const fixed = await fixUzbekGrammar(original)
      if (correctingRef.current === original && fixed !== original) {
        onChange(fixed)
        setCorrected(true)
      }
    },
  }
}

function CorrectedBadge({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <span
      title="AI tomonidan tuzatildi (imlo)"
      style={{
        position: "absolute", top: -6, right: -6, fontSize: 9, lineHeight: "14px", width: 14, height: 14,
        borderRadius: 999, background: "#f59e0b", color: "#fff", textAlign: "center", pointerEvents: "none",
      }}
    >✨</span>
  )
}

function DocInput({ value, onChange, placeholder, bold, align, tone = "green" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; bold?: boolean; align?: "left" | "right"; tone?: "green" | "blue"
}) {
  const handlers = useGrammarFixOnBlur(value, onChange)
  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        onChange={(e) => handlers.onChange(e.target.value)}
        onBlur={handlers.onBlur}
        placeholder={placeholder ?? "Yozing..."}
        style={{
          border: `1px solid ${TONE_BORDER[tone]}`, outline: "none", background: TONE_BG[tone], width: "100%",
          fontFamily: FONT, fontSize: 11.5, color: INK, fontWeight: bold ? 600 : 400,
          textAlign: align ?? "left", borderRadius: 5, padding: "3px 7px",
        }}
      />
      <CorrectedBadge show={handlers.corrected} />
    </div>
  )
}

function DocTextarea({ value, onChange, placeholder, rows = 2, tone = "green" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; tone?: "green" | "blue"
}) {
  const handlers = useGrammarFixOnBlur(value, onChange)
  return (
    <div style={{ position: "relative" }}>
      <textarea
        value={value}
        onChange={(e) => handlers.onChange(e.target.value)}
        onBlur={handlers.onBlur}
        placeholder={placeholder ?? "Yozing..."}
        rows={rows}
        style={{
          border: `1px solid ${TONE_BORDER[tone]}`, outline: "none", background: TONE_BG[tone], width: "100%", resize: "vertical",
          fontFamily: FONT, fontSize: 11.5, color: INK, borderRadius: 5, padding: "5px 7px",
        }}
      />
      <CorrectedBadge show={handlers.corrected} />
    </div>
  )
}

function RowLabel({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 11.5, color: MUTED, flexShrink: 0, fontFamily: FONT }}>{children}</span>
}

function Section({ n, title, caption, children }: { n: number; title: string; caption?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 6, fontFamily: FONT }}>{n}.{title}</div>
      {caption && <div style={{ fontSize: 10, fontStyle: "italic", color: MUTED, marginBottom: 6, fontFamily: FONT }}>{caption}</div>}
      <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px" }}>{children}</div>
    </div>
  )
}

function BulletList({ items, onChange, placeholder, tone = "green" }: {
  items: string[]; onChange: (v: string[]) => void; placeholder?: string; tone?: "green" | "blue"
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: MUTED, fontFamily: FONT }}>–</span>
          <div style={{ flex: 1 }}><DocInput value={it} placeholder={placeholder} tone={tone} onChange={(v) => onChange(items.map((x, idx) => (idx === i ? v : x)))} /></div>
          <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="cursor-pointer text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]">
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="mt-1 flex w-fit cursor-pointer items-center gap-1 text-xs text-[var(--color-accent)] hover:underline">
        <Plus size={12} /> Qator qo'shish
      </button>
    </div>
  )
}

export function TzDocumentDialog({ open, onOpenChange, projectId, projectName, projectActivityName, projectBusinessType, clientCompanyName }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  projectId: string
  projectName: string
  projectActivityName: string | null
  projectBusinessType: string | null
  clientCompanyName: string | null
}) {
  const [data, setData] = useState<TzData>(emptyTzData())
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(false)
  const [fixingAll, setFixingAll] = useState(false)

  async function fixAllNow() {
    setFixingAll(true)
    try {
      setData(await fixAllStringsDeep(data))
    } finally {
      setFixingAll(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setLoading(true)
    ;(async () => {
      const { data: existing } = await supabase
        .from("project_documents").select("data").eq("project_id", projectId).eq("doc_type", "tz").maybeSingle()
      if (existing?.data && Object.keys(existing.data).length > 0) {
        setData({ ...emptyTzData(), ...(existing.data as Partial<TzData>) })
      } else {
        const { data: contract } = await supabase.from("contracts").select("number").eq("project_id", projectId).limit(1).maybeSingle()
        const businessLabel = BUSINESS_TYPES.find((b) => b.key === projectBusinessType)?.label ?? ""
        setData({
          ...emptyTzData(),
          loyihaNomi: projectName,
          faoliyatSohasi: businessLabel || projectActivityName || "",
          asosiyMahsulot: projectActivityName ?? "",
          clientCompanyName: clientCompanyName ?? projectName,
          shartnomaRaqami: contract?.number ?? "",
          sana: todayUzDate(),
          kirmaydiganIshlar: [...KIRMAYDIGAN_ISHLAR_DEFAULT],
          muddat: "5 kun",
          qabulMezonlari: [
            "AI tizim kelishilgan kanalda ishlaydi",
            "AI asosiy vazifalarni bajaradi",
            "Tizimga ma'lumot to'g'ri yuboriladi",
            "Test bosqichi o'tkazilgan",
            "Kelishilgan texnik xatolar tuzatilgan",
            "Buyurtmachiga tizimdan foydalanish tartibi tushuntirilgan",
          ],
        })
      }
      setLoading(false)
      setPreview(false)
    })()
  }, [open, projectId, projectName, projectActivityName, projectBusinessType, clientCompanyName])

  function set<K extends keyof TzData>(key: K, value: TzData[K]) {
    setData((d) => ({ ...d, [key]: value }))
  }

  async function save() {
    const html = renderTzDocHtml(data)
    const { error } = await supabase.from("project_documents").upsert(
      { project_id: projectId, doc_type: "tz", data, generated_html: html, updated_at: new Date().toISOString() },
      { onConflict: "project_id,doc_type" }
    )
    if (error) {
      alert("Hujjatni saqlab bo'lmadi: " + error.message)
      return
    }
    onOpenChange(false)
  }

  async function printDoc() {
    await downloadDocPdf(renderTzDocHtml(data), `${data.loyihaNomi || "texnik-topshiriq"} — Texnik topshiriq.pdf`)
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} title="Texnik topshiriq">
        <p className="py-8 text-center text-sm text-[var(--color-ink-faint)]">Yuklanmoqda...</p>
      </Dialog>
    )
  }

  if (preview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} title="Texnik topshiriq — ko'rinish" className="max-w-4xl">
        <div className="max-h-[70vh] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)]" dangerouslySetInnerHTML={{ __html: renderTzDocHtml(data) }} />
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => setPreview(false)}>Tahrirlashga qaytish</Button>
          <Button variant="outline" onClick={printDoc}><Printer size={14} /> Chop etish / PDF</Button>
          <Button variant="accent" className="flex-1" onClick={save}>Saqlash</Button>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Texnik topshiriq — tahrirlash" className="max-w-4xl">
      <div style={{ fontFamily: FONT }} className="max-h-[70vh] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] p-5">
        {/* Header (static chrome) */}
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `2px solid ${INK}`, paddingBottom: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: INK }}>{COMPANY_NAME}</div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: FAINT, marginTop: 2 }}>{COMPANY_TAGLINE}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", color: FAINT }}>ILOVA №1 — TEXNIK TOPSHIRIQ</div>
            <input
              value={data.loyihaNomi}
              onChange={(e) => set("loyihaNomi", e.target.value)}
              placeholder="Loyiha nomi"
              style={{
                fontWeight: 700, fontSize: 15, color: INK, marginTop: 2, textAlign: "right", width: 180,
                border: `1px solid ${TONE_BORDER.green}`, background: TONE_BG.green, borderRadius: 5, padding: "1px 6px", fontFamily: FONT, outline: "none",
              }}
            />
          </div>
        </div>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", color: FAINT, marginBottom: 6 }}>
            AI INTEGRATSIYA XIZMATLARINI KO'RSATISH SHARTNOMASI {data.shartnomaRaqami ? `№${data.shartnomaRaqami} ` : ""}GA ILOVA
          </div>
          <div style={{ fontSize: 21, fontWeight: 700, color: INK }}>Texnik topshiriq</div>
        </div>
        <div style={{ background: HEAD_BG, borderRadius: 10, padding: "10px 14px", fontSize: 10, color: MUTED, marginBottom: 14, lineHeight: 1.5 }}>
          Ushbu ilova AI integratsiya xizmatlari bo'yicha asosiy shartnomaning ajralmas qismi hisoblanadi. Hujjat O'zbekiston Respublikasi qonunchiligi
          talablarini inobatga olgan namunaviy shaklda tayyorlangan. Amaliy foydalanishdan oldin kompaniya rekvizitlari, soliq holati, faoliyat shakli
          va aniq loyiha shartlariga moslashtirilishi tavsiya etiladi.
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", border: `1px solid ${LINE}`, borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
          {([["SHAHAR", "shahar"], ["SANA", "sana"], ["SHARTNOMA RAQAMI", "shartnomaRaqami"]] as const).map(([label, key], i) => (
            <div key={key} style={{ flex: 1, padding: "9px 14px", borderLeft: i > 0 ? `1px solid ${LINE}` : undefined }}>
              <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.06em", color: FAINT, marginBottom: 3 }}>{label}</div>
              <DocInput value={data[key]} onChange={(v) => set(key, v)} />
            </div>
          ))}
        </div>

        <Section n={1} title="LOYIHA HAQIDA UMUMIY MA'LUMOT">
          {[
            ["Loyiha nomi:", "loyihaNomi", "Loyiha nomi"], ["Buyurtmachi faoliyat sohasi:", "faoliyatSohasi", "Masalan: Ishlab chiqarish"],
            ["Asosiy mahsulot yoki xizmatlar:", "asosiyMahsulot", "Asosiy mahsulot/xizmat"], ["Mas'ul shaxs:", "masulShaxs", "Ism"], ["Aloqa kanali:", "aloqaKanali", "Masalan: Telegram"],
          ].map(([label, key, ph]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: `1px dotted ${LINE}` }}>
              <RowLabel>{label}</RowLabel>
              <div style={{ flex: 1, maxWidth: 260 }}>
                <DocInput align="right" bold placeholder={ph} value={data[key as keyof TzData] as string} onChange={(v) => set(key as keyof TzData, v as any)} />
              </div>
            </div>
          ))}
        </Section>

        <Section n={2} title="LOYIHA MAQSADI">
          <BulletList items={data.maqsadlar} onChange={(v) => set("maqsadlar", v)} placeholder="Masalan: Ovozli buyruqlar orqali Ibox tizimiga tezkor ma'lumot kiritish" />
        </Section>

        <Section n={3} title="JORIY BIZNES HOLATI">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={{ textAlign: "left", padding: "7px 10px", fontSize: 8.5, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: MUTED, background: HEAD_BG }}>Savol</th>
              <th style={{ textAlign: "left", padding: "7px 10px", fontSize: 8.5, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: MUTED, background: HEAD_BG }}>Buyurtmachi javobi</th>
              <th style={{ width: 30 }}></th>
            </tr></thead>
            <tbody>
              {data.bizesHolati.map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: "6px 10px", borderBottom: `1px solid ${LINE}` }}>
                    <DocInput value={r.savol} onChange={(v) => set("bizesHolati", data.bizesHolati.map((x, idx) => (idx === i ? { ...x, savol: v } : x)))} />
                  </td>
                  <td style={{ padding: "6px 10px", borderBottom: `1px solid ${LINE}` }}>
                    <DocInput bold value={r.javob} onChange={(v) => set("bizesHolati", data.bizesHolati.map((x, idx) => (idx === i ? { ...x, javob: v } : x)))} />
                  </td>
                  <td style={{ borderBottom: `1px solid ${LINE}` }}>
                    <button type="button" onClick={() => set("bizesHolati", data.bizesHolati.filter((_, idx) => idx !== i))} className="cursor-pointer text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => set("bizesHolati", [...data.bizesHolati, { savol: "", javob: "" }])} className="mt-2 flex w-fit cursor-pointer items-center gap-1 text-xs text-[var(--color-accent)] hover:underline">
            <Plus size={12} /> Qator qo'shish
          </button>
        </Section>

        <Section n={4} title="YASALADIGAN AI TIZIM TURI">
          <DocInput bold value={data.aiTizimTuri} onChange={(v) => set("aiTizimTuri", v)} placeholder="AI agent — ovozli buyruqlarni tushunuvchi va Ibox tizimiga ma'lumot kirituvchi Telegram bot" />
        </Section>

        <Section n={5} title="AI TIZIM BAJARADIGAN ASOSIY VAZIFALAR">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.vazifalar.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: MUTED, fontWeight: 600 }}>{i + 1}.</span>
                <div style={{ flex: 1 }}><DocInput value={it} placeholder="Masalan: Ovozli xabarni tushunib, Ibox tizimining tegishli bo'limiga ma'lumot kiritadi" onChange={(v) => set("vazifalar", data.vazifalar.map((x, idx) => (idx === i ? v : x)))} /></div>
                <button type="button" onClick={() => set("vazifalar", data.vazifalar.filter((_, idx) => idx !== i))} className="cursor-pointer text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"><Trash2 size={12} /></button>
              </div>
            ))}
            <button type="button" onClick={() => set("vazifalar", [...data.vazifalar, ""])} className="mt-1 flex w-fit cursor-pointer items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"><Plus size={12} /> Qator qo'shish</button>
          </div>
        </Section>

        <Section n={6} title="AI TIZIM ISHLAYDIGAN KANALLAR">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              {["Kanal", "Vazifasi", "Izoh"].map((h) => <th key={h} style={{ textAlign: "left", padding: "7px 10px", fontSize: 8.5, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: MUTED, background: HEAD_BG }}>{h}</th>)}
              <th style={{ width: 30 }}></th>
            </tr></thead>
            <tbody>
              {data.kanallar.map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: "6px 10px", borderBottom: `1px solid ${LINE}` }}><DocInput bold value={r.kanal} onChange={(v) => set("kanallar", data.kanallar.map((x, idx) => (idx === i ? { ...x, kanal: v } : x)))} /></td>
                  <td style={{ padding: "6px 10px", borderBottom: `1px solid ${LINE}` }}><DocInput value={r.vazifasi} onChange={(v) => set("kanallar", data.kanallar.map((x, idx) => (idx === i ? { ...x, vazifasi: v } : x)))} /></td>
                  <td style={{ padding: "6px 10px", borderBottom: `1px solid ${LINE}` }}><DocInput value={r.izoh} onChange={(v) => set("kanallar", data.kanallar.map((x, idx) => (idx === i ? { ...x, izoh: v } : x)))} /></td>
                  <td style={{ borderBottom: `1px solid ${LINE}` }}><button type="button" onClick={() => set("kanallar", data.kanallar.filter((_, idx) => idx !== i))} className="cursor-pointer text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => set("kanallar", [...data.kanallar, { kanal: "", vazifasi: "", izoh: "" }])} className="mt-2 flex w-fit cursor-pointer items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"><Plus size={12} /> Qator qo'shish</button>
        </Section>

        <Section n={7} title="INTEGRATSIYA QILINADIGAN PLATFORMALAR" caption="Uchinchi tomon platformalarining abonent to'lovi, token xarajatlari, API xarajatlari va boshqa tashqi xarajatlari Buyurtmachi tomonidan alohida to'lanadi.">
          <DocTextarea value={data.platformalar} onChange={(v) => set("platformalar", v)} placeholder="Ibox (asosiy tizim), Telegram Bot API (muloqot kanali), Google Sheets (zaxira nusxa), Claude API (AI model), Aisha AI (ovozli xabarni matnga aylantirish)" rows={2} />
        </Section>

        <Section n={8} title="INTEGRATSIYA LOGIKASI">
          <div className="mb-2"><DocTextarea value={data.integratsiyaTavsifi} onChange={(v) => set("integratsiyaTavsifi", v)} rows={2} placeholder="AI tizim ovozli xabardan mahsulot nomi, miqdori, narxi, sanasi, bo'lim, mas'ul xodim, izohni aniqlab, tegishli tizimga yuboradi" /></div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              {["Bosqich nomi", "Ma'nosi"].map((h) => <th key={h} style={{ textAlign: "left", padding: "7px 10px", fontSize: 8.5, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: MUTED, background: HEAD_BG }}>{h}</th>)}
              <th style={{ width: 30 }}></th>
            </tr></thead>
            <tbody>
              {data.bosqichlar.map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: "6px 10px", borderBottom: `1px solid ${LINE}` }}><DocInput value={r.nomi} placeholder="Masalan: Ovozli xabar qabul qilindi" onChange={(v) => set("bosqichlar", data.bosqichlar.map((x, idx) => (idx === i ? { ...x, nomi: v } : x)))} /></td>
                  <td style={{ padding: "6px 10px", borderBottom: `1px solid ${LINE}` }}><DocInput value={r.manosi} placeholder="Masalan: Foydalanuvchi botga ovozli xabar yubordi" onChange={(v) => set("bosqichlar", data.bosqichlar.map((x, idx) => (idx === i ? { ...x, manosi: v } : x)))} /></td>
                  <td style={{ borderBottom: `1px solid ${LINE}` }}><button type="button" onClick={() => set("bosqichlar", data.bosqichlar.filter((_, idx) => idx !== i))} className="cursor-pointer text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => set("bosqichlar", [...data.bosqichlar, { nomi: "", manosi: "" }])} className="mt-2 flex w-fit cursor-pointer items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"><Plus size={12} /> Qator qo'shish</button>
        </Section>

        <Section n={9} title="AI MULOQOT USLUBI">
          {([
            ["Til", "til", "O'zbek"],
            ["Ohang", "ohang", ""],
            ["Majburiy iboralar", "majburiyIboralar", ""],
            ["Taqiqlangan iboralar", "taqiqlanganIboralar", ""],
            ["Menejerga o'tkazish shartlari", "menejergaOtkazish", ""],
          ] as const).map(([label, key, ph]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: `1px dotted ${LINE}` }}>
              <RowLabel>{label}</RowLabel>
              <div style={{ flex: 1, maxWidth: 320 }}>
                <DocInput align="right" placeholder={ph || "Yozing..."} value={data[key as keyof TzData] as string} onChange={(v) => set(key as keyof TzData, v as any)} />
              </div>
            </div>
          ))}
        </Section>

        <Section n={10} title="AI JAVOB BERMASLIGI KERAK BO'LGAN HOLATLAR">
          <BulletList items={data.taqiqlanganHolatlar} onChange={(v) => set("taqiqlanganHolatlar", v)} placeholder="Masalan: yuridik masala" />
        </Section>

        <Section n={11} title="BAJARILADIGAN ISHLAR RO'YXATI" caption="Bajaruvchi tomonidan amalga oshiriladigan loyihalashtirish bosqichlari.">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={{ width: 24, padding: "7px 10px", fontSize: 8.5, fontWeight: 600, color: MUTED, background: HEAD_BG }}>№</th>
              {["Ish nomi", "Natija"].map((h) => <th key={h} style={{ textAlign: "left", padding: "7px 10px", fontSize: 8.5, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: MUTED, background: HEAD_BG }}>{h}</th>)}
              <th style={{ width: 30 }}></th>
            </tr></thead>
            <tbody>
              {data.ishlar.map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: "6px 10px", borderBottom: `1px solid ${LINE}`, fontSize: 11.5, color: MUTED }}>{i + 1}</td>
                  <td style={{ padding: "6px 10px", borderBottom: `1px solid ${LINE}` }}><DocInput value={r.nomi} placeholder="Masalan: Brifing va audit" onChange={(v) => set("ishlar", data.ishlar.map((x, idx) => (idx === i ? { ...x, nomi: v } : x)))} /></td>
                  <td style={{ padding: "6px 10px", borderBottom: `1px solid ${LINE}` }}><DocInput value={r.natija} placeholder="Masalan: Biznes jarayon tushuniladi" onChange={(v) => set("ishlar", data.ishlar.map((x, idx) => (idx === i ? { ...x, natija: v } : x)))} /></td>
                  <td style={{ borderBottom: `1px solid ${LINE}` }}><button type="button" onClick={() => set("ishlar", data.ishlar.filter((_, idx) => idx !== i))} className="cursor-pointer text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => set("ishlar", [...data.ishlar, { nomi: "", natija: "" }])} className="mt-2 flex w-fit cursor-pointer items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"><Plus size={12} /> Qator qo'shish</button>
        </Section>

        <Section n={12} title="LOYIHAGA KIRMAYDIGAN ISHLAR">
          <BulletList items={data.kirmaydiganIshlar} onChange={(v) => set("kirmaydiganIshlar", v)} tone="blue" />
        </Section>

        <Section n={13} title="LOYIHA MUDDATI VA QABUL QILISH MEZONLARI" caption="Muddat shartnoma imzolanishi, oldindan to'lov kelib tushishi, zarur ma'lumotlar va kirish ruxsatlari berilishi hamda texnik topshiriq tasdiqlanishidan keyin boshlanadi.">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", marginBottom: 10, borderBottom: `1px dotted ${LINE}` }}>
            <RowLabel>Loyiha umumiy muddati:</RowLabel>
            <div style={{ flex: 1, maxWidth: 260 }}>
              <DocInput align="right" bold placeholder="Masalan: 5 kun — 16.07.2026 dan 20.07.2026 gacha" value={data.muddat} onChange={(v) => set("muddat", v)} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {data.qabulMezonlari.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 13, height: 13, border: `1.5px solid ${MUTED}`, borderRadius: 3, flexShrink: 0, display: "inline-block" }} />
                <div style={{ flex: 1 }}><DocInput value={it} onChange={(v) => set("qabulMezonlari", data.qabulMezonlari.map((x, idx) => (idx === i ? v : x)))} /></div>
                <button type="button" onClick={() => set("qabulMezonlari", data.qabulMezonlari.filter((_, idx) => idx !== i))} className="cursor-pointer text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"><Trash2 size={12} /></button>
              </div>
            ))}
            <button type="button" onClick={() => set("qabulMezonlari", [...data.qabulMezonlari, ""])} className="mt-1 flex w-fit cursor-pointer items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"><Plus size={12} /> Qator qo'shish</button>
          </div>
        </Section>

        <div style={{ textAlign: "center", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", color: FAINT, margin: "18px 0 10px" }}>TOMONLARNING TASDIG'I</div>
        <div style={{ display: "flex", gap: 14 }}>
          {(["BAJARUVCHI", "BUYURTMACHI"] as const).map((label) => (
            <div key={label} style={{ flex: 1, border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: INK, marginBottom: 8 }}>{label}</div>
              {["Kompaniya", "Vakil", "Imzo", "Muhr"].map((l) => (
                <div key={l} style={{ display: "flex", gap: 8, fontSize: 11, color: MUTED, marginBottom: 5 }}>
                  <span style={{ width: 70, flexShrink: 0 }}>{l}:</span>
                  <span style={{ flex: 1, borderBottom: `1px dotted ${LINE}`, color: INK }}>
                    {l === "Kompaniya" ? (label === "BAJARUVCHI" ? COMPANY_NAME : (
                      <DocInput value={data.clientCompanyName} onChange={(v) => set("clientCompanyName", v)} />
                    )) : ""}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Lightbulb size={14} className="mt-2 text-[var(--color-warning)]" />
        <p className="flex-1 py-1.5 text-xs text-[var(--color-ink-faint)]">Kulrang matn — qanday yozish kerakligini ko'rsatuvchi namuna, u avtomatik saqlanmaydi.</p>
        <Button type="button" variant="outline" onClick={fixAllNow} disabled={fixingAll}>{fixingAll ? "Tuzatilmoqda..." : "✨ Barchasini tuzatish"}</Button>
        <Button variant="outline" onClick={() => setPreview(true)}>Ko'rinish</Button>
        <Button variant="accent" onClick={save}>Saqlash</Button>
      </div>
    </Dialog>
  )
}
