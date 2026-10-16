import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Dialog } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import {
  emptySupportData, renderSupportDocHtml, COMPANY_NAME, COMPANY_TAGLINE, ACCENT, todayUzDate,
  INK, MUTED, FAINT, LINE, HEAD_BG, FONT, type SupportData,
} from "@/lib/aiIntegratorDocs"
import { Plus, Trash2, Lightbulb, Printer } from "lucide-react"
import { downloadDocPdf } from "@/lib/pdfExport"
import { fixUzbekGrammar, fixAllStringsDeep } from "@/lib/grammarFix"

// Same visible tinted-box editing primitives as the other two document
// dialogs — every adaptable slot must be obviously clickable/writable.

const TONE_BG = { green: "#eefaf1", blue: "#eaf3fc" }
const TONE_BORDER = { green: "#b9e6c4", blue: "#bcdcf7" }

// Auto-corrects O'zbek apostrophe/orthography (o', g') on blur, and tracks
// whether the last correction actually changed anything so the field can
// show a small "AI tuzatildi" badge — editor-only, never part of the
// generated document (renderSupportDocHtml doesn't know this state exists).
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

function DocInput({ value, onChange, placeholder, tone = "green", width }: {
  value: string; onChange: (v: string) => void; placeholder?: string; tone?: "green" | "blue"; width?: number
}) {
  const handlers = useGrammarFixOnBlur(value, onChange)
  return (
    <div style={{ position: "relative", display: "inline-block", width: width ? `${width}px` : "100%" }}>
      <input
        value={value}
        onChange={(e) => handlers.onChange(e.target.value)}
        onBlur={handlers.onBlur}
        placeholder={placeholder ?? "Yozing..."}
        style={{
          border: `1px solid ${TONE_BORDER[tone]}`, outline: "none", background: TONE_BG[tone], width: "100%",
          fontFamily: FONT, fontSize: 11.5, color: INK, borderRadius: 5, padding: "3px 7px",
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

const isLikelyUrl = (s: string) => /^(https?:\/\/|data:image\/)/i.test(s.trim())

// Mirrors clientLogoBadge() from aiIntegratorDocs.ts: a real image URL shows
// as a circular photo, plain text (initials, a short name) shows as a
// colored text badge instead of a broken-image icon.
function LogoBadge({ value }: { value: string }) {
  const v = value.trim()
  if (!v) return null
  if (isLikelyUrl(v)) {
    return <img src={v} onError={(e) => { e.currentTarget.style.display = "none" }} style={{ width: 32, height: 32, borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />
  }
  return (
    <div style={{ width: 32, height: 32, borderRadius: 999, background: ACCENT, color: "#fff", fontSize: 10, fontWeight: 700, textAlign: "center", lineHeight: "32px", flexShrink: 0 }}>
      {v.slice(0, 3).toUpperCase()}
    </div>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 6, fontFamily: FONT }}>{n}.{title}</div>
      <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px" }}>{children}</div>
    </div>
  )
}

function Inline({ parts }: { parts: (string | { value: string; onChange: (v: string) => void; width?: number; placeholder?: string })[] }) {
  return (
    <div style={{ fontSize: 11.5, color: INK, lineHeight: 2.1, fontFamily: FONT }}>
      {parts.map((p, i) =>
        typeof p === "string" ? <span key={i}>{p}</span> : (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}>
            <DocInput value={p.value} onChange={p.onChange} width={p.width ?? 90} placeholder={p.placeholder} />
          </span>
        )
      )}
    </div>
  )
}

function BulletList({ items, onChange, sign, placeholder, tone = "blue" }: {
  items: string[]; onChange: (v: string[]) => void; sign: "+" | "–"; placeholder?: string; tone?: "green" | "blue"
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: MUTED, fontFamily: FONT }}>{sign}</span>
          <div style={{ flex: 1 }}><DocInput value={it} placeholder={placeholder} tone={tone} onChange={(v) => onChange(items.map((x, idx) => (idx === i ? v : x)))} /></div>
          <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="cursor-pointer text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"><Trash2 size={12} /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="mt-1 flex w-fit cursor-pointer items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"><Plus size={12} /> Qator qo'shish</button>
    </div>
  )
}

export function SupportDocumentDialog({ open, onOpenChange, projectId, projectName, clientCompanyName }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  projectId: string
  projectName: string
  clientCompanyName: string | null
}) {
  const [data, setData] = useState<SupportData>(emptySupportData())
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
        .from("project_documents").select("data").eq("project_id", projectId).eq("doc_type", "support_terms").maybeSingle()
      if (existing?.data && Object.keys(existing.data).length > 0) {
        setData({ ...emptySupportData(), ...(existing.data as Partial<SupportData>) })
      } else {
        const { data: contract } = await supabase.from("contracts").select("number").eq("project_id", projectId).limit(1).maybeSingle()
        setData({
          ...emptySupportData(),
          buyurtmachiNomi: clientCompanyName ?? projectName,
          shartnomaRaqami: contract?.number ?? "",
          ilovaRaqami: contract?.number ?? "",
          sana: todayUzDate(),
          muddatKun: "60",
          tanlanganPaket: "Loyiha narxiga kiritilgan bepul texnik qo'llab-quvvatlash. Ushbu paket loyihaning bir qismi sifatida, qo'shimcha to'lovsiz taqdim etiladi.",
          kiradi: [
            "Xatolarni tuzatish",
            "Mijoz bilan aloqada bo'lib, savollariga javob berish",
            "Mijozga tizimdan foydalanishni o'rgatish",
          ],
          kirmaydi: [
            "Yangi funksiyalar qo'shish",
            "Mavjud funksiyalarni o'zgartirish",
            "Yangi integratsiya qo'shish",
            "Boshqa qo'shimcha o'zgarishlar kiritish",
          ],
          javobVaqti: "24 soat",
          kirmaydiganHolatlar: [
            "Buyurtmachi yoki uchinchi shaxs tizimni buzib qo'ygan bo'lsa",
            "Login yoki parol noto'g'ri berilgan bo'lsa",
            "Token limiti tugagan bo'lsa",
            "Tegishli servislar uchun to'lov qilinmagan bo'lsa",
          ],
        })
      }
      setLoading(false)
      setPreview(false)
    })()
  }, [open, projectId, projectName, clientCompanyName])

  function set<K extends keyof SupportData>(key: K, value: SupportData[K]) {
    setData((d) => ({ ...d, [key]: value }))
  }

  async function save() {
    const html = renderSupportDocHtml(data)
    const { error } = await supabase.from("project_documents").upsert(
      { project_id: projectId, doc_type: "support_terms", data, generated_html: html, updated_at: new Date().toISOString() },
      { onConflict: "project_id,doc_type" }
    )
    if (error) {
      alert("Hujjatni saqlab bo'lmadi: " + error.message)
      return
    }
    onOpenChange(false)
  }

  async function printDoc() {
    await downloadDocPdf(renderSupportDocHtml(data), `${data.buyurtmachiNomi || "qollab-quvvatlash"} — Qollab-quvvatlash shartlari.pdf`)
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} title="Texnik qo'llab-quvvatlash shartlari">
        <p className="py-8 text-center text-sm text-[var(--color-ink-faint)]">Yuklanmoqda...</p>
      </Dialog>
    )
  }

  if (preview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} title="Qo'llab-quvvatlash shartlari — ko'rinish" className="max-w-4xl">
        <div className="max-h-[70vh] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)]" dangerouslySetInnerHTML={{ __html: renderSupportDocHtml(data) }} />
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => setPreview(false)}>Tahrirlashga qaytish</Button>
          <Button variant="outline" onClick={printDoc}><Printer size={14} /> Chop etish / PDF</Button>
          <Button variant="accent" className="flex-1" onClick={save}>Saqlash</Button>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Texnik qo'llab-quvvatlash shartlari — tahrirlash" className="max-w-4xl">
      <div style={{ fontFamily: FONT }} className="max-h-[70vh] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] p-5">
        {/* Header (static chrome) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${INK}`, paddingBottom: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: INK }}>{COMPANY_NAME}</div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: FAINT, marginTop: 2 }}>{COMPANY_TAGLINE}</div>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 9.5, color: MUTED }}>Mijoz logotipi (ixtiyoriy — URL yoki matn/qisqartma):</span>
            <DocInput value={data.clientLogoUrl} onChange={(v) => set("clientLogoUrl", v)} placeholder="https://... yoki masalan DNZ" width={180} />
            <LogoBadge value={data.clientLogoUrl} />
          </div>
        </div>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", color: FAINT, marginBottom: 6 }}>AI INTEGRATSIYA XIZMATLARI SHARTNOMASIGA ILOVA</div>
          <div style={{ fontSize: 21, fontWeight: 700, color: INK }}>Texnik qo'llab-quvvatlash shartlari</div>
        </div>
        <div style={{ background: HEAD_BG, borderRadius: 10, padding: "10px 14px", fontSize: 10, color: MUTED, marginBottom: 14, lineHeight: 1.5 }}>
          Ushbu ilova AI integratsiya xizmatlari bo'yicha asosiy shartnomaning ajralmas qismi hisoblanadi va tomonlar o'rtasidagi texnik qo'llab-quvvatlash shartlarini belgilaydi.
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", border: `1px solid ${LINE}`, borderRadius: 10, marginBottom: 12, overflow: "hidden" }}>
          {([["SHARTNOMA RAQAMI", "shartnomaRaqami"], ["ILOVA RAQAMI", "ilovaRaqami"], ["SHAHAR", "shahar"], ["SANA", "sana"]] as const).map(([label, key], i) => (
            <div key={key} style={{ flex: 1, padding: "9px 14px", borderLeft: i > 0 ? `1px solid ${LINE}` : undefined }}>
              <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.06em", color: FAINT, marginBottom: 3 }}>{label}</div>
              <DocInput value={data[key]} onChange={(v) => set(key, v)} placeholder={key === "shahar" ? "Toshkent" : key === "sana" ? "07.06.2026" : "14"} />
            </div>
          ))}
        </div>

        {/* Parties row */}
        <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
          <div style={{ flex: 1, border: `1px solid ${LINE}`, borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.06em", color: FAINT, marginBottom: 3 }}>BAJARUVCHI</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: INK }}>{COMPANY_NAME}</div>
            <div className="mt-1 flex items-center gap-1.5"><span style={{ fontSize: 10, color: MUTED }}>Mas'ul shaxslar:</span><DocInput value={data.masulShaxslar} onChange={(v) => set("masulShaxslar", v)} placeholder="Azizjon, Asad" /></div>
          </div>
          <div style={{ flex: 1, border: `1px solid ${LINE}`, borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.06em", color: FAINT, marginBottom: 3 }}>BUYURTMACHI</div>
            <DocInput value={data.buyurtmachiNomi} onChange={(v) => set("buyurtmachiNomi", v)} placeholder="Mijoz kompaniyasi nomi" />
          </div>
        </div>

        <Section n={1} title="Qo'llab-quvvatlash muddati">
          <Inline parts={[
            "Bepul qo'llab-quvvatlash muddati — ",
            { value: data.muddatKun, onChange: (v) => set("muddatKun", v), width: 50, placeholder: "60" },
            " kun, ya'ni ",
            { value: data.muddatBoshlanish, onChange: (v) => set("muddatBoshlanish", v), width: 100, placeholder: "07.07.2026" },
            " — ",
            { value: data.muddatTugash, onChange: (v) => set("muddatTugash", v), width: 100, placeholder: "05.09.2026" },
            " oralig'ida amal qiladi. Ushbu muddat tugaganidan so'ng texnik qo'llab-quvvatlash tomonlar kelishuviga asosan alohida xizmat sifatida davom ettirilishi mumkin.",
          ]} />
        </Section>

        <Section n={2} title="Tanlangan paket">
          <DocTextarea value={data.tanlanganPaket} onChange={(v) => set("tanlanganPaket", v)} rows={2} placeholder="Loyiha narxiga kiritilgan bepul texnik qo'llab-quvvatlash..." />
        </Section>

        <Section n={3} title="Xizmat doirasi">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", color: MUTED, marginBottom: 6 }}>BEPUL QO'LLAB-QUVVATLASHGA KIRADI</div>
              <BulletList items={data.kiradi} onChange={(v) => set("kiradi", v)} sign="+" placeholder="Masalan: Xatolarni tuzatish" />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", color: MUTED, marginBottom: 6 }}>BEPUL QO'LLAB-QUVVATLASHGA KIRMAYDI</div>
              <BulletList items={data.kirmaydi} onChange={(v) => set("kirmaydi", v)} sign="–" placeholder="Masalan: Yangi funksiyalar qo'shish" />
            </div>
          </div>
        </Section>

        <Section n={4} title="Javob berish vaqti">
          <Inline parts={["Murojaatlarga ", { value: data.javobVaqti, onChange: (v) => set("javobVaqti", v), width: 80, placeholder: "24 soat" }, " davomida javob beriladi."]} />
        </Section>

        <Section n={5} title="Texnik qo'llab-quvvatlashga kirmaydigan holatlar">
          <div className="grid grid-cols-2 gap-2.5">
            {data.kirmaydiganHolatlar.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1"><DocInput value={it} tone="blue" placeholder="Masalan: Token limiti tugagan bo'lsa" onChange={(v) => set("kirmaydiganHolatlar", data.kirmaydiganHolatlar.map((x, idx) => (idx === i ? v : x)))} /></div>
                <button type="button" onClick={() => set("kirmaydiganHolatlar", data.kirmaydiganHolatlar.filter((_, idx) => idx !== i))} className="cursor-pointer text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => set("kirmaydiganHolatlar", [...data.kirmaydiganHolatlar, ""])} className="mt-2 flex w-fit cursor-pointer items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"><Plus size={12} /> Qator qo'shish</button>
        </Section>

        <div style={{ textAlign: "center", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", color: FAINT, margin: "18px 0 10px" }}>TOMONLARNING IMZOLARI</div>
        <div style={{ display: "flex", gap: 14 }}>
          {(["BAJARUVCHI", "BUYURTMACHI"] as const).map((label) => (
            <div key={label} style={{ flex: 1, border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: INK, marginBottom: 8 }}>{label}</div>
              {["F.I.Sh. / Kompaniya", "Vakil", "Imzo", "Muhr"].map((l) => (
                <div key={l} style={{ display: "flex", gap: 8, fontSize: 11, color: MUTED, marginBottom: 5 }}>
                  <span style={{ width: 90, flexShrink: 0 }}>{l}:</span>
                  <span style={{ flex: 1, borderBottom: `1px dotted ${LINE}`, color: INK }}>
                    {l === "F.I.Sh. / Kompaniya" ? (label === "BAJARUVCHI" ? COMPANY_NAME : data.buyurtmachiNomi) : ""}
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
