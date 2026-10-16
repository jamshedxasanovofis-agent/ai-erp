import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Dialog } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import {
  emptyKpData, renderKpDocHtml, COMPANY_NAME, COMPANY_TAGLINE, todayUzDate,
  INK, MUTED, FAINT, LINE, HEAD_BG, FONT, type KpData,
} from "@/lib/aiIntegratorDocs"
import { Plus, Trash2, Lightbulb, Printer } from "lucide-react"
import { downloadDocPdf } from "@/lib/pdfExport"
import { fixUzbekGrammar, fixAllStringsDeep } from "@/lib/grammarFix"

// Same visible tinted-box editing primitives as TzDocumentDialog — every
// adaptable slot must be obviously clickable/writable, never an invisible
// borderless field (lesson from the "can't write anywhere" bug on doc #1).

const TONE_BG = { green: "#eefaf1", blue: "#eaf3fc" }
const TONE_BORDER = { green: "#b9e6c4", blue: "#bcdcf7" }

// Auto-corrects O'zbek apostrophe/orthography (o', g') on blur, and tracks
// whether the last correction actually changed anything so the field can
// show a small "AI tuzatildi" badge — editor-only, never part of the
// generated document (renderKpDocHtml doesn't know this state exists).
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

function DocInput({ value, onChange, placeholder, bold, align, tone = "green", width }: {
  value: string; onChange: (v: string) => void; placeholder?: string; bold?: boolean; align?: "left" | "right"; tone?: "green" | "blue"; width?: number
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
          fontFamily: FONT, fontSize: 11.5, color: INK, fontWeight: bold ? 600 : 400,
          textAlign: align ?? "left", borderRadius: 5, padding: "3px 7px",
        }}
      />
      <CorrectedBadge show={handlers.corrected} />
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

// Static legal-boilerplate paragraph — never editable (yellow in the reference).
function Static({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, color: INK, lineHeight: 1.9, fontFamily: FONT }}>{children}</div>
}

// A sentence made of fixed text runs interleaved with small adaptable value
// chips — matches reference contracts where only specific words inside an
// otherwise-static legal sentence vary per project.
function Inline({ parts }: { parts: (string | { value: string; onChange: (v: string) => void; width?: number; placeholder?: string })[] }) {
  return (
    <div style={{ fontSize: 11.5, color: INK, lineHeight: 2.1, fontFamily: FONT }}>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}>
            <DocInput value={p.value} onChange={p.onChange} width={p.width ?? 140} placeholder={p.placeholder} />
          </span>
        )
      )}
    </div>
  )
}

function TableSection({ headers, rows, onChange, placeholders, emptyRow }: {
  headers: string[]
  rows: { nomi: string; natija?: string; foiz?: string; summa?: string }[]
  onChange: (rows: any[]) => void
  placeholders?: string[]
  emptyRow: Record<string, string>
}) {
  const keys = Object.keys(emptyRow)
  return (
    <>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>
          <th style={{ width: 24, padding: "7px 10px", fontSize: 8.5, fontWeight: 600, color: MUTED, background: HEAD_BG }}>№</th>
          {headers.map((h) => <th key={h} style={{ textAlign: "left", padding: "7px 10px", fontSize: 8.5, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: MUTED, background: HEAD_BG }}>{h}</th>)}
          <th style={{ width: 30 }}></th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ padding: "6px 10px", borderBottom: `1px solid ${LINE}`, fontSize: 11.5, color: MUTED }}>{i + 1}</td>
              {keys.map((k, ki) => (
                <td key={k} style={{ padding: "6px 10px", borderBottom: `1px solid ${LINE}` }}>
                  <DocInput value={(r as any)[k] ?? ""} placeholder={placeholders?.[ki]} onChange={(v) => onChange(rows.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)))} />
                </td>
              ))}
              <td style={{ borderBottom: `1px solid ${LINE}` }}><button type="button" onClick={() => onChange(rows.filter((_, idx) => idx !== i))} className="cursor-pointer text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"><Trash2 size={12} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={() => onChange([...rows, { ...emptyRow }])} className="mt-2 flex w-fit cursor-pointer items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"><Plus size={12} /> Qator qo'shish</button>
    </>
  )
}

function BulletList({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: MUTED, fontFamily: FONT }}>–</span>
          <div style={{ flex: 1 }}><DocInput value={it} placeholder={placeholder} onChange={(v) => onChange(items.map((x, idx) => (idx === i ? v : x)))} /></div>
          <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="cursor-pointer text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"><Trash2 size={12} /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="mt-1 flex w-fit cursor-pointer items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"><Plus size={12} /> Qator qo'shish</button>
    </div>
  )
}

export function KpDocumentDialog({ open, onOpenChange, projectId, projectName, clientCompanyName }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  projectId: string
  projectName: string
  clientCompanyName: string | null
}) {
  const [data, setData] = useState<KpData>(emptyKpData())
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
        .from("project_documents").select("data").eq("project_id", projectId).eq("doc_type", "kp").maybeSingle()
      if (existing?.data && Object.keys(existing.data).length > 0) {
        const loaded = { ...emptyKpData(), ...(existing.data as Partial<KpData>) }
        // Backfill rows saved by an earlier buggy build that could drop a
        // column's key entirely (e.g. a row saved as {nomi} with no natija).
        loaded.etaplar = loaded.etaplar.length ? loaded.etaplar.map((r) => ({ nomi: r.nomi ?? "", natija: r.natija ?? "" })) : [{ nomi: "", natija: "" }]
        loaded.toLovBosqichlari = loaded.toLovBosqichlari.length ? loaded.toLovBosqichlari.map((r) => ({ nomi: r.nomi ?? "", foiz: r.foiz ?? "", summa: r.summa ?? "" })) : [{ nomi: "", foiz: "", summa: "" }]
        setData(loaded)
      } else {
        const { data: contract } = await supabase.from("contracts").select("number").eq("project_id", projectId).limit(1).maybeSingle()
        setData({
          ...emptyKpData(),
          buyurtmachiNomi: clientCompanyName ?? projectName,
          shartnomaRaqami: contract?.number ?? "",
          sana: todayUzDate(),
          bosqichSoni: "2",
          muddat: "5 (besh) kun",
          etaplar: [{ nomi: "", natija: "" }],
          toLovBosqichlari: [{ nomi: "", foiz: "50%", summa: "" }, { nomi: "", foiz: "50%", summa: "" }],
          aniqlashtirish: [""],
        })
      }
      setLoading(false)
      setPreview(false)
    })()
  }, [open, projectId, projectName, clientCompanyName])

  function set<K extends keyof KpData>(key: K, value: KpData[K]) {
    setData((d) => ({ ...d, [key]: value }))
  }

  async function save() {
    const html = renderKpDocHtml(data)
    const { error } = await supabase.from("project_documents").upsert(
      { project_id: projectId, doc_type: "kp", data, generated_html: html, updated_at: new Date().toISOString() },
      { onConflict: "project_id,doc_type" }
    )
    if (error) {
      alert("Hujjatni saqlab bo'lmadi: " + error.message)
      return
    }
    onOpenChange(false)
  }

  async function printDoc() {
    await downloadDocPdf(renderKpDocHtml(data), `${data.buyurtmachiNomi || "tijorat-taklifi"} — Tijorat taklifi.pdf`)
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} title="Tijorat taklifi">
        <p className="py-8 text-center text-sm text-[var(--color-ink-faint)]">Yuklanmoqda...</p>
      </Dialog>
    )
  }

  if (preview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} title="Tijorat taklifi — ko'rinish" className="max-w-4xl">
        <div className="max-h-[70vh] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)]" dangerouslySetInnerHTML={{ __html: renderKpDocHtml(data) }} />
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => setPreview(false)}>Tahrirlashga qaytish</Button>
          <Button variant="outline" onClick={printDoc}><Printer size={14} /> Chop etish / PDF</Button>
          <Button variant="accent" className="flex-1" onClick={save}>Saqlash</Button>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Tijorat taklifi — tahrirlash" className="max-w-4xl">
      <div style={{ fontFamily: FONT }} className="max-h-[70vh] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] p-5">
        {/* Header (static chrome) */}
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `2px solid ${INK}`, paddingBottom: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: INK }}>{COMPANY_NAME}</div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: FAINT, marginTop: 2 }}>{COMPANY_TAGLINE}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", color: FAINT }}>TIJORAT TAKLIFI VA SHARTNOMA ASOSLARI</div>
            <input
              value={data.buyurtmachiNomi}
              onChange={(e) => set("buyurtmachiNomi", e.target.value)}
              placeholder="Mijoz nomi"
              style={{
                fontWeight: 700, fontSize: 15, color: INK, marginTop: 2, textAlign: "right", width: 180,
                border: `1px solid ${TONE_BORDER.green}`, background: TONE_BG.green, borderRadius: 5, padding: "1px 6px", fontFamily: FONT, outline: "none",
              }}
            />
          </div>
        </div>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", color: FAINT, marginBottom: 6 }}>AI INTEGRATSIYA XIZMATLARI SHARTNOMASIGA ASOS</div>
          <div style={{ fontSize: 21, fontWeight: 700, color: INK, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
            <input
              value={data.buyurtmachiNomi}
              onChange={(e) => set("buyurtmachiNomi", e.target.value)}
              placeholder="Mijoz nomi"
              style={{
                fontWeight: 700, fontSize: 21, color: INK, textAlign: "center", width: 240,
                border: `1px solid ${TONE_BORDER.green}`, background: TONE_BG.green, borderRadius: 6, padding: "1px 8px", fontFamily: FONT, outline: "none",
              }}
            />
            <span>uchun AI integratsiya xizmatlari uchun shartnoma</span>
          </div>
        </div>
        <div style={{ background: HEAD_BG, borderRadius: 10, padding: "10px 14px", fontSize: 10, color: MUTED, marginBottom: 14, lineHeight: 1.5 }}>
          Bir tomondan {data.bajaruvchiNomi || COMPANY_NAME}, keyingi o'rinlarda "Bajaruvchi" deb yuritiladi, ikkinchi tomondan {data.buyurtmachiNomi || "Mijoz"},
          keyingi o'rinlarda "Buyurtmachi" deb yuritilib, birgalikda "Tomonlar" deb, ushbu hujjatni tayyorladilar.
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", border: `1px solid ${LINE}`, borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
          {([["SHAHAR", "shahar"], ["SANA", "sana"], ["SHARTNOMA RAQAMI", "shartnomaRaqami"], ["BAJARUVCHI", "bajaruvchiNomi"], ["BUYURTMACHI", "buyurtmachiNomi"]] as const).map(([label, key], i) => (
            <div key={key} style={{ flex: 1, padding: "9px 14px", borderLeft: i > 0 ? `1px solid ${LINE}` : undefined }}>
              <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.06em", color: FAINT, marginBottom: 3 }}>{label}</div>
              <DocInput value={data[key]} onChange={(v) => set(key, v)} />
            </div>
          ))}
        </div>

        <Section n={1} title="SHARTNOMA PREDMETI">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Inline parts={[
              "1.1. Bajaruvchi Buyurtmachiga ",
              { value: data.agentTavsifi, onChange: (v) => set("agentTavsifi", v), width: 260, placeholder: "Telegram bot orqali ishlaydigan ovozli AI-agent" },
              " integratsiyasini taqdim etadi. ",
              { value: data.tizimNomi, onChange: (v) => set("tizimNomi", v), width: 80, placeholder: "Ibox" },
              " tizimining ",
              { value: data.bolimlar, onChange: (v) => set("bolimlar", v), width: 180, placeholder: "\"Ishlab chiqarish\" va \"Sotib olish\"" },
              " bo'limlariga tegishli ma'lumotlarni kiritadi.",
            ]} />
            <Inline parts={[
              "1.2. AI",
              { value: data.turi, onChange: (v) => set("turi", v), width: 70, placeholder: "agent" },
              " quyidagi funksiyalarni bajaradi: ",
              { value: data.hisobotTuri, onChange: (v) => set("hisobotTuri", v), width: 180, placeholder: "kompaniya, sotuvchi yoki haydovchi" },
              " bo'yicha hisobotlar taqdim etadi, ",
              { value: data.vazifaTavsifi, onChange: (v) => set("vazifaTavsifi", v), width: 300, placeholder: "mahsulot sotib olish va ishlab chiqarish ma'lumotlarini qo'shadi" },
              ".",
            ]} />
            <Inline parts={[
              "1.3. Xizmat ",
              { value: data.bosqichSoni, onChange: (v) => set("bosqichSoni", v), width: 30 },
              " bosqichga bo'lingan. Ushbu shartnoma barcha bosqichlarni ham qamrab oladi (2-bandda batafsil).",
            ]} />
            <Static>1.4. Texnik topshiriqda ko'rsatilmagan qo'shimcha ish yoki qo'shimcha talab har doim yozma kelishuv va alohida haq evaziga bajariladi. Qo'shimcha ish loyiha narxi, muddati va texnik arxitekturaga ta'sir qilishi mumkin. Biroq Bajaruvchi o'z ixtiyori bilan qaror bo'lib, ayrim kichik qo'shimcha funksiyalar uchun alohida to'lov almasligi mumkin.</Static>
          </div>
        </Section>

        <Section n={2} title="XIZMATLAR ETAPLARI">
          <TableSection headers={["Bajariladigan ish", "Natija"]} rows={data.etaplar} onChange={(v) => set("etaplar", v)} emptyRow={{ nomi: "", natija: "" }} placeholders={["Ibox tizimi bilan integratsiya", "Ovozli AI-agent Ibox'ning tegishli bo'limlariga ma'lumot kirita oladi"]} />
          <div style={{ marginTop: 14, background: HEAD_BG, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: MUTED, marginBottom: 6 }}>MA'LUMOTLARNI ANIQLASHTIRISH</div>
            <BulletList items={data.aniqlashtirish} onChange={(v) => set("aniqlashtirish", v)} placeholder="Ibox tizimi — barcha funksiyalar rasmiy API orqali test qilingan va to'liq ishlashi tasdiqlangan" />
          </div>
        </Section>

        <Section n={3} title="TO'LOV TARTIBI">
          <Inline parts={["3.1. Umumiy qiymati: ", { value: data.umumiyQiymat, onChange: (v) => set("umumiyQiymat", v), width: 300, placeholder: "6 250 000 (olti million ikki yuz ellik ming) so'm" }, "."]} />
          <div style={{ marginTop: 10 }}>
            <TableSection headers={["To'lov bosqichi", "Miqdori", "Summa"]} rows={data.toLovBosqichlari as any} onChange={(v) => set("toLovBosqichlari", v)} emptyRow={{ nomi: "", foiz: "", summa: "" }} placeholders={["1-bosqich to'lovi — Ibox ulanishi", "50%", "3 125 000 so'm"]} />
          </div>
          <Static>
            <div style={{ marginTop: 10 }}>
              3.2. To'lov belgilangan sanada amalga oshirilishi shart. Tegishli to'lov tushmaguncha Bajaruvchi ishni to'xtatib turish huquqiga ega.<br/>
              3.3. Boshlangan bosqich uchun to'langan mablag' qaytarilmaydi, chunki Bajaruvchi vaqt, tajriba va texnik resurs sarflagan.<br/>
              3.4. Agar ishlar boshlanmasdan shartnoma bekor bo'lsa, boshlang'ich to'lovning 70% Buyurtmachiga 10 ish kuni ichida qaytariladi.<br/>
              3.5. Qo'shimcha ishlar alohida hisob-kitob asosida bajariladi. Bajaruvchi qo'shimcha ishni boshlashdan oldin taxminiy narx va muddatni Buyurtmachiga ma'lum qiladi.
            </div>
          </Static>
        </Section>

        <Section n={4} title="TASHQI HARAJATLAR">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Inline parts={[
              "4.1. Quyidagi xarajatlar Bajaruvchi xizmat narxiga kirmaydi: AI model tokenlari, ",
              { value: data.qoshimchaXarajatlar, onChange: (v) => set("qoshimchaXarajatlar", v), width: 200, placeholder: "Ibox obuna to'lovi" },
              ", hosting va server, boshqa SaaS platformalar.",
            ]} />
            <Static>
              4.2. Buyurtmachi uchinchi tomon platformalariga o'z hisobidan to'laydi.<br/>
              4.3. Bajaruvchi uchinchi tomon platformalarining narx o'zgarishi, blokdlash, ishlamay qolishi, texnik xatosi yoki siyosat o'zgarishi uchun javobgar emas.
            </Static>
          </div>
        </Section>

        <Section n={5} title="MUDDAT VA KECHIKISHLAR">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Inline parts={[
              "5.1. Umumiy loyiha muddati: ",
              { value: data.muddat, onChange: (v) => set("muddat", v), width: 110, placeholder: "5 (besh) kun" },
              " — ",
              { value: data.boshlanishSana, onChange: (v) => set("boshlanishSana", v), width: 110, placeholder: "16.07.2026" },
              " dan ",
              { value: data.tugashSana, onChange: (v) => set("tugashSana", v), width: 110, placeholder: "20.07.2026" },
              " gacha. Muddat quyidagi shartlar bajarilgan kundan boshlab hisoblanadi: shartnoma imzolangan, boshlang'ich to'lov amalga oshirilgan, zarur ma'lumot va kirish ruxsatlari berilgan, texnik topshiriq tasdiqlangan.",
            ]} />
            <Inline parts={[
              "5.2. Quyidagi holatlarda loyiha muddati avtomatik uzaytiriladi: Buyurtmachi to'lovni kechiktirsa; ",
              { value: data.kechikishSabablari, onChange: (v) => set("kechikishSabablari", v), width: 300, placeholder: "Ibox kirish ma'lumotlarini kechiktirsa; texnik topshiriq o'zgarsa" },
              "; uchinchi tomon platformalarida nosozlik yuzaga kelsa.",
            ]} />
            <Static>5.3. Buyurtmachi 5 (besh) ish kuni davomida javob bermasa yoki kerakli ma'lumotni bermasa, loyiha vaqtincha to'xtatilishi mumkin. Bu davr uchun Bajaruvchi muddat kechikishiga javobgar bo'lmaydi.</Static>
          </div>
        </Section>

        <Section n={6} title="BAJARUVCHINING MAJBURIYATLARI VA HUQUQLARI">
          <Static>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: MUTED, marginBottom: 6 }}>BAJARUVCHI MAJBUR:</div>
            6.1. Xizmatlarni professional darajada, kelishilgan texnik topshiriq asosida bajarish.<br/>
            6.2. Buyurtmachining biznes jarayonlarini o'rganib, unga mos AI yechim taklif qilish.<br/>
            6.3. AI tizimini sozlash, integratsiya qilish, test qilish va ishga tushirish.<br/>
            6.4. O'z aybi bilan yuzaga kelgan texnik kamchiliklarni qo'llab-quvvatlash muddati ichida tuzatish.<br/>
            6.5. Buyurtmachining maxfiy ma'lumotlarini uchinchi shaxslarga oshkor qilmaslik.<br/>
            6.6. Buyurtmachi so'ragan o'zgarishlar muddat, narx yoki murakkablikka ta'sir qilsa, bu haqda oldindan xabar berish.
            <div style={{ fontSize: 9.5, fontWeight: 700, color: MUTED, margin: "10px 0 6px" }}>BAJARUVCHI HUQUQLI:</div>
            6.7. To'lovni o'z vaqtida to'liq talab qilish. To'lov kechiksa — ishni vaqtinchalik to'xtatib turish.<br/>
            6.8. Xizmatni bajarish uchun zarur bo'lgan barcha ma'lumot, kirish huquqlari va API kalitlarini Buyurtmachidan talab qilish.<br/>
            6.9. Buyurtmachi sababli yuzaga kelgan kechikishlar uchun muddatlarini uzaytirish.<br/>
            6.10. Dastlabki kelishuvga kiritilmagan ishlarni bepul bajarmaslik — biroq Bajaruvchi o'z xohishiga ko'ra ayrim kichik qo'shimcha ishlarni bepul bajarishi mumkin.<br/>
            6.11. Zarurat bo'lsa, loyiha uchun dasturchi yoki boshqa mutaxassislarni jalb qilish.<br/>
            6.12. O'zining metodologiyasi, shablonlari va texnik yechimlaridan boshqa loyihalarda ham foydalanish.<br/>
            6.13. Buyurtmachining ruxsati bilan loyiha natijasini portfolio yoki keys sifatida ko'rsatish.<br/>
            6.14. Aniq miqdorda sotuv, foyda yoki daromad kafolatlanmaydi — natija taqdim etilgan ma'lumot sifati va Buyurtmachi boshqaruviga ham bog'liq.
          </Static>
        </Section>

        <Section n={7} title="BUYURTMACHINING MAJBURIYATLARI VA HUQUQLARI">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: MUTED }}>BUYURTMACHI MAJBUR:</div>
            <Inline parts={[
              "7.1. Loyiha uchun zarur ma'lumotlar, login-parollar, API kalitlari (",
              { value: data.tizimlarRoyxati, onChange: (v) => set("tizimlarRoyxati", v), width: 160, placeholder: "Ibox, Google Sheets" },
              ") to'liq, aniq va o'z vaqtida taqdim etish.",
            ]} />
            <Static>
              7.2. Kerakli platformalar va akkauntlarga kirish ruxsatlarini taqdim etish.<br/>
              7.3. Loyiha bo'yicha bitta mas'ul shaxs tayinlash.<br/>
              7.4. Loyiha bo'yicha materiallarni, test natijalarini va bajarilgan ishlarni 3 (uch) ish kuni ichida ko'rib chiqish va tasdiqlash. Agar Buyurtmachi ushbu muddat ichida yozma e'tiroz bildirmasa, ish avtomatik tasdiqlangan hisoblanadi.<br/>
              7.5. To'lovlarni belgilangan sanalarda amalga oshirish, uchinchi tomon tashqi xarajatlarini mustaqil to'lash.<br/>
              7.6. AI tizimidan mas'uliyat bilan foydalanish, xodimlarga to'g'ri tushuntirish.<br/>
              7.7. Loyiha davomida Bajaruvchi bilan kelishmasdan integratsiyalarni yoki sozlamalarni o'zgartirmaslik.<br/>
              7.8. Bajaruvchiga berilgan ma'lumotlarning to'g'riligi va to'liqligi uchun javobgar.
              <div style={{ fontSize: 9.5, fontWeight: 700, color: MUTED, margin: "10px 0 6px" }}>BUYURTMACHI HUQUQLI:</div>
              7.9. Kelishilgan xizmatlarni texnik topshiriq doirasida olish.<br/>
              7.10. Loyiha jarayoni bo'yicha ma'lumot so'rash.<br/>
              7.11. Tizimni ishga tushirishdan oldin test qilish.<br/>
              7.12. Bajaruvchi aybi bilan yuzaga kelgan texnik xatolarni muddat ichida tuzatishni talab qilish.<br/>
              7.13. Qo'shimcha funksiya yoki integratsiyani alohida haq evaziga buyurtma qilish.
            </Static>
          </div>
        </Section>

        <Section n={8} title="ISHNI QABUL QILISH TARTIBI">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Static>
              8.1. Bajaruvchi har bir bosqich bo'yicha Buyurtmachiga demo, havola, test muhiti yoki boshqa tasdiqlovchi material taqdim etadi.<br/>
              8.2. Buyurtmachi bajarilgan ishni 3 (uch) ish kuni ichida ko'rib chiqishi kerak. Agar ushbu muddat ichida yozma e'tiroz bildirmasa, ish qabul qilingan hisoblanadi.<br/>
              8.3. E'tirozlar aniq, asosli va kelishilgan texnik topshiriq doirasida bo'lishi kerak.
            </Static>
            <Inline parts={[
              "8.4. Quyidagilar kamchilik hisoblanmaydi: Buyurtmachining fikri o'zgarishi; texnik topshiriqda bo'lmagan yangi funksiya so'ralishi; ",
              { value: data.qabulMisollari, onChange: (v) => set("qabulMisollari", v), width: 300, placeholder: "Ibox platformasi xatosi; ovozli xabar noaniq yoki tushunarsiz" },
              " yoki tushunarsiz bo'lgani sababli AI-agent aniqlashtiruvchi savol bergani.",
            ]} />
            <Static>
              8.5. Yakuniy kirish ruxsatlari va hujjatlar faqat to'liq to'lovdan keyin taqdim etiladi.<br/>
              8.6. Bajaruvchi bajarilgan ish haqida Buyurtmachi bilan onlayn uchrashuv qilib, ishni tasdiqlab qabul qilib olishi kerak.
            </Static>
          </div>
        </Section>

        <Section n={9} title="AI TEXNOLOGIYASI CHEKLOVLARI">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Static>
              9.1. Sun'iy intellekt texnologiyasi ehtimollik asosida ishlashini tushunadi.<br/>
              9.2. AI mutlaqo ideal javob beradi deb inson qarorini to'liq almashtirilmaydi. Moliyaviy jihatdan muhim qarorlarni Buyurtmachi nazorat qilishi shart.
            </Static>
            <Inline parts={[
              "9.3. AI tizimi sifati Buyurtmachining taqdim etilgan ma'lumotlari (",
              { value: data.tizimlarRoyxati, onChange: (v) => set("tizimlarRoyxati", v), width: 160, placeholder: "Ibox, Google Sheets" },
              ")ning to'liqligiga bog'liq. Noto'g'ri yoki yetarli bo'lmagan ma'lumot berilsa, AI javoblaridagi xatolar uchun Buyurtmachi javobgar emas.",
            ]} />
            <Static>9.4. AI yordamchi va tahlil qiluvchi vosita sifatida ishlatiladi. Uni nazoratsiz, to'liq mustaqil qaror qabul qiluvchi vosita sifatida ishlatish tavsiya etilmaydi.</Static>
          </div>
        </Section>

        <Section n={10} title="MAXFIYLIK VA INTELLEKTUAL MULK">
          <Static>
            10.1. Tomonlar hamkorlik davomida olingan barcha biznes, moliyaviy va texnik ma'lumotlarni uchinchi shaxslarga oshkor qilmaydi.<br/>
            10.2. Maxfiylik majburiyati shartnoma tugagandan keyin ham 3 (uch) yil davomida amal qiladi.<br/>
            10.3. Bajaruvchining oldindan mavjud metodologiyasi, prompt shablonlari va nou-xau Bajaruvchi mulki bo'lib qoladi.<br/>
            10.4. Buyurtmachi to'liq to'lovdan keyin AI tizimidan o'z biznesida foydalanish huquqiga ega. Ammo Bajaruvchining ichki metodologiyasi va nou-xaudagi eksklyuziv huquq olmaydi. Loyihadan faqat Buyurtmachi foydalanishi mumkin. Qayta sotish taqiqlanadi.<br/>
            10.5. Buyurtmachi Bajaruvchining integratsiya yechimi yoki uchinchi shaxslarga sotishi, nusxalashi yoki tarqatishga haqli emas. Ushbu band buzilgani aniqlansa, Buyurtmachi shartnoma qiymatining 100% miqdorida jarima to'laydi.
          </Static>
        </Section>

        <Section n={11} title="MA'LUMOTLAR VA XAVFSIZLIK">
          <Static>
            11.1. Bajaruvchi Buyurtmachi ma'lumotlaridan faqat loyiha bajarish maqsadida foydalanadi.<br/>
            11.2. Bajaruvchi quyidagi holatlar uchun javobgar emas: Buyurtmachi xodimlari sababli ma'lumot yo'qolishi; platformada nosozlik; zaif parol; akkauntga ruxsatsiz kirish; Bajaruvchi bilan kelishilmagan texnik o'zgarishlar.<br/>
            11.3. Ma'lumotlar zaxira nusxasini saqlash Buyurtmachi zimmasida, agar bekor xizmat alohida kelishilgan bo'lsa.
          </Static>
        </Section>

        <Section n={12} title="TEXNIK QO'LLAB-QUVVATLASH">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Static>12.1. Loyiha topshirilgandan keyin 30 (o'ttiz) kalendar kun davomida bepul texnik qo'llab-quvvatlash amalga oshiriladi. Xatolarni tuzatish, mijoz bilan aloqada bo'lish, tizimdan foydalanishni o'rgatish.</Static>
            <Inline parts={[
              "12.2. Tashqi xizmatlar (",
              { value: data.tashqiXizmatlarQQ, onChange: (v) => set("tashqiXizmatlarQQ", v), width: 200, placeholder: "Ibox obunasi va boshqalar" },
              ") uchun xarajatlarni Buyurtmachi loyiha boshidanoq o'zi to'laydi.",
            ]} />
            <Static>
              12.3. Ushbu muddatdan keyingi qo'llab-quvvatlash alohida oylik xizmat sifatida rasmiylashtiriladi.<br/>
              12.4. Qo'llab-quvvatlashga kirmaydi: yangi funksiya yasash, yangi integratsiya ulash, katta hajmdagi qayta ishlash — bular alohida kelishuv asosida bajariladi.
            </Static>
          </div>
        </Section>

        <Section n={13} title="JAVOBGARLIK VA KAFOLAT">
          <Static>
            13.1. Bajaruvchining ushbu shartnoma bo'yicha umumiy javobgarligi amalda to'langan summa miqdoridan oshmaydi.<br/>
            13.2. Bajaruvchi yo'qotilgan foyda, yo'qotilgan sotuv, mijozlar ketishi yoki biznes ko'rsatkichlari sababli zarar uchun javobgar emas.<br/>
            13.3. Kafolat quyidagi hollarda qo'llanilmaydi: uchinchi tomon platformalari nosozligi; API o'zgarishi; token yoki obuna to'lovi qilinmagani; Buyurtmachi tizimni o'zgartirgani.<br/>
            13.4. Buyurtmachi yoki uchinchi shaxs Bajaruvchi bilan kelishmasdan tizimga o'zgartirish kiritsa, kafolat majburiyati bekor qilinadi.<br/>
            13.5. Aniq miqdorda sotuv yoki daromad natijasi kafolatlanmaydi — bu taqdim etilgan ma'lumot sifati va Buyurtmachi boshqaruviga ham bog'liq.
          </Static>
        </Section>

        <Section n={14} title="SHARTNOMANI BEKOR QILISH VA TO'XTATISH">
          <Static>
            14.1. Har bir Tomon 14 (o'n to'rt) kalendar kun oldin yozma ogohlantirib shartnomani bekor qilishi mumkin.<br/>
            14.2. Bekor qilish bajarilgan ish uchun to'lov majburiyatidan ozod qilmaydi.<br/>
            14.3. Qarzdorlik mavjud bo'lsa, yakuniy topshiriq to'liq to'lov amalga oshirilguncha to'xtatiladi.<br/>
            14.4. Bajaruvchi ishni to'xtatishi mumkin: to'lov kechiksa; zarur ma'lumotlar yoki ruxsatlar berilmasa; texnik topshiriqdan tashqari ish bepul talab qilinsa.<br/>
            14.5. Noaniq topshiriqlar, kech javoblar yoki qaror-qarshiliklar sababli yuzaga kelgan kechikishlar uchun Bajaruvchi javobgar emas.
          </Static>
        </Section>

        <Section n={15} title="FORS-MAJOR VA NIZOLAR">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Static>
              15.1. Tomonlar o'ziga bog'liq bo'lmagan holatlar (tabiiy ofat, davlat cheklovlari, internet uzilishi, server nosozligi, kiber hujum, qonunchilikdagi kutilmagan o'zgarishlar) sababli javobgarlikdan ozod etiladi.<br/>
              15.2. Fors-major 30 (o'ttiz) kundan ortiq davom etsa, har bir Tomon shartnomani bekor qilish huquqiga ega — bajarilgan ishlar uchun hisob-kitob qilinadi.
            </Static>
            <Inline parts={[
              "15.3. Nizolar avval muzokara orqali hal qilinadi. Yozma da'voga 10 (o'n) ish kuni ichida javob beriladi. Natija bo'lmasa — ",
              { value: data.sudShahri, onChange: (v) => set("sudShahri", v), width: 120, placeholder: "Samarqand" },
              " shahar sudi vakolatli.",
            ]} />
          </div>
        </Section>

        <Section n={16} title="YAKUNIY QOIDALAR">
          <Static>
            16.1. Shartnoma imzolangan kundan kuchga kiradi va majburiyatlar to'liq bajarilgunicha amal qiladi.<br/>
            16.2. Ilovalar, texnik topshiriq va yozma tasdiqlar shartnomaning ajralmas qismi.<br/>
            16.3. Har qanday o'zgartirish yozma shaklda rasmiylashtiriladi.<br/>
            16.4. Shartnoma ERI yoki yozma imzo orqali tasdiqlanishi mumkin — ikki nusxada, teng yuridik kuchga ega.<br/>
            16.5. Muhim qarorlar, tasdiqlar va e'tirozlar yozma shaklda berilishi kerak.
          </Static>
        </Section>

        <Section n={17} title="MIJOZ UCHUN XIZMAT NARXIDAN TASHQARI BONUSLAR">
          <BulletList items={data.bonuslar} onChange={(v) => set("bonuslar", v)} placeholder="Masalan: 1 oy bepul texnik qo'llab-quvvatlash" />
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
                    {l === "Kompaniya" ? (label === "BAJARUVCHI" ? data.bajaruvchiNomi : (
                      <DocInput value={data.buyurtmachiNomi} onChange={(v) => set("buyurtmachiNomi", v)} />
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
