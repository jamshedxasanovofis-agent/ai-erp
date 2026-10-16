// Shared "AI Integrator" branded document design system — matches the
// reference PDFs (Texnik topshiriq / Tijorat taklifi / Qo'llab-quvvatlash
// shartlari) pixel-for-pixel in structure. Used by all 3 redesigned document
// generators; the older proposalTemplate.ts systems remain untouched for the
// other document types (Payment Schedule, Support Act, Access Act,
// Acceptance Act, NDA, Change Request).

export const INK = "#181a1f"
export const MUTED = "#6b7280"
export const FAINT = "#9aa0ab"
export const LINE = "#e2e5eb"
export const HEAD_BG = "#f4f5f7"
export const ACCENT = "#1b2a5e"
export const FONT = "'Inter', 'Segoe UI', system-ui, sans-serif"

export const COMPANY_NAME = "AI Integrator"
export const COMPANY_TAGLINE = "INTELLIGENT SYSTEMS & AUTOMATION"

function esc(s: string | null | undefined) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// O'zbekiston standarti: kun.oy.yil (masalan 22.07.2026) — AQSh uslubidagi
// yil-oy-kun (ISO) formatidan foydalanmaymiz.
export function todayUzDate(): string {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${dd}.${mm}.${d.getFullYear()}`
}

function isLikelyUrl(s: string) {
  return /^(https?:\/\/|data:image\/)/i.test(s.trim())
}

// Client "logo" slot that degrades gracefully: a real image URL renders as
// a circular photo (with a hidden fallback on load failure), while plain
// text (initials, a short name) renders as a colored text badge instead of
// a broken-image icon.
export function clientLogoBadge(value: string) {
  const v = (value ?? "").trim()
  if (!v) return ""
  if (isLikelyUrl(v)) {
    return `<img src="${esc(v)}" onerror="this.style.display='none'" style="width:32px; height:32px; border-radius:999px; object-fit:cover; flex-shrink:0;" />`
  }
  const initials = v.slice(0, 3).toUpperCase()
  return `<div style="width:32px; height:32px; border-radius:999px; background:${ACCENT}; color:#fff; font-size:10px; font-weight:700; text-align:center; line-height:32px; flex-shrink:0;">${esc(initials)}</div>`
}

export function docHeader(opts: { ilovaLabel: string; projectName: string; clientLogoUrl?: string | null }) {
  return `
  <div style="display:flex; align-items:flex-start; justify-content:space-between; padding-bottom:10px; border-bottom:2px solid ${INK}; margin-bottom:16px;">
    <div>
      <div style="font-weight:700; font-size:15px; color:${INK};">${esc(COMPANY_NAME)}</div>
      <div style="font-size:9px; font-weight:600; letter-spacing:0.08em; color:${FAINT}; margin-top:2px;">${esc(COMPANY_TAGLINE)}</div>
    </div>
    <div style="text-align:right; display:flex; align-items:center; gap:8px;">
      ${opts.ilovaLabel || opts.projectName ? `
      <div>
        <div style="font-size:9px; font-weight:600; letter-spacing:0.06em; color:${FAINT};">${esc(opts.ilovaLabel)}</div>
        <div style="font-weight:700; font-size:15px; color:${INK}; margin-top:2px;">${esc(opts.projectName)}</div>
      </div>` : ""}
      ${clientLogoBadge(opts.clientLogoUrl ?? "")}
    </div>
  </div>`
}

export function docTitleBlock(subtitle: string, title: string) {
  return `
  <div style="text-align:center; margin-bottom:14px;">
    <div style="font-size:9.5px; font-weight:600; letter-spacing:0.08em; color:${FAINT}; margin-bottom:6px;">${esc(subtitle)}</div>
    <div style="font-size:21px; font-weight:700; color:${INK};">${esc(title)}</div>
  </div>`
}

export function docMetaRow(fields: { label: string; value: string; editableId?: string }[]) {
  const cells = fields.map((f) => `
    <div style="flex:1; padding:9px 14px;">
      <div style="font-size:8.5px; font-weight:600; letter-spacing:0.06em; color:${FAINT}; margin-bottom:3px;">${esc(f.label)}</div>
      <div style="font-size:12.5px; color:${INK};">${esc(f.value)}</div>
    </div>`).join(`<div style="width:1px; background:${LINE};"></div>`)
  return `<div style="display:flex; border:1px solid ${LINE}; border-radius:10px; margin-bottom:16px; overflow:hidden; page-break-inside:avoid; break-inside:avoid;">${cells}</div>`
}

export function docSection(n: number, title: string, contentHtml: string, caption?: string) {
  return `
  <div style="margin-bottom:14px; page-break-inside:avoid; break-inside:avoid;">
    <div style="font-size:12px; font-weight:700; color:${INK}; margin-bottom:6px;">${n}.${esc(title)}</div>
    ${caption ? `<div style="font-size:10px; font-style:italic; color:${MUTED}; margin-bottom:6px;">${esc(caption)}</div>` : ""}
    <div style="border:1px solid ${LINE}; border-radius:10px; padding:12px 14px;">${contentHtml}</div>
  </div>`
}

export function docFieldRow(label: string, value: string) {
  return `
  <div style="display:flex; justify-content:space-between; gap:12px; padding:6px 0; border-bottom:1px dotted ${LINE};">
    <span style="font-size:11.5px; color:${MUTED}; flex-shrink:0;">${esc(label)}</span>
    <span style="font-size:11.5px; font-weight:600; color:${INK}; text-align:right; flex:1;">${esc(value)}</span>
  </div>`
}

export function docTable(headers: string[], rows: string[][]) {
  const thead = `<tr>${headers.map((h) => `<th style="text-align:left; padding:7px 10px; font-size:8.5px; font-weight:600; letter-spacing:0.05em; text-transform:uppercase; color:${MUTED}; background:${HEAD_BG}; border-bottom:1px solid ${LINE};">${esc(h)}</th>`).join("")}</tr>`
  const tbody = rows.map((r) => `
    <tr style="page-break-inside:avoid; break-inside:avoid;">${r.map((c) => `<td style="padding:8px 10px; font-size:11.5px; color:${INK}; border-bottom:1px solid ${LINE}; vertical-align:top;">${esc(c)}</td>`).join("")}</tr>`).join("")
  return `<table style="width:100%; border-collapse:collapse; font-family:${FONT};"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`
}

export function docBullets(items: string[]) {
  return `<div style="display:flex; flex-direction:column; gap:5px;">${items.map((it) => `
    <div style="display:flex; gap:6px; font-size:11.5px; color:${INK}; page-break-inside:avoid; break-inside:avoid;">
      <span style="color:${MUTED};">–</span>
      <span style="flex:1;">${esc(it)}</span>
    </div>`).join("")}</div>`
}

export function docNumbered(items: string[]) {
  return `<div style="display:flex; flex-direction:column; gap:5px;">${items.map((it, i) => `
    <div style="display:flex; gap:6px; font-size:11.5px; color:${INK}; page-break-inside:avoid; break-inside:avoid;">
      <span style="font-weight:600; color:${MUTED};">${i + 1}.</span>
      <span style="flex:1;">${esc(it)}</span>
    </div>`).join("")}</div>`
}

export function docChecklist(items: string[]) {
  return `<div style="display:flex; flex-direction:column; gap:7px;">${items.map((it) => `
    <div style="display:flex; align-items:center; gap:8px; font-size:11.5px; color:${INK}; page-break-inside:avoid; break-inside:avoid;">
      <span style="width:13px; height:13px; border:1.5px solid ${MUTED}; border-radius:3px; flex-shrink:0; display:inline-block;"></span>
      <span style="flex:1;">${esc(it)}</span>
    </div>`).join("")}</div>`
}

// A sentence made of fixed text runs interleaved with small adaptable
// values — matches reference contracts where only specific words inside an
// otherwise-fixed legal sentence vary per project (e.g. "...tizimining
// {ibox} bo'limlariga..."). Plain text, no visual distinction from the
// surrounding static text — the green/blue tinting is an editing-UI-only
// affordance (see TzDocumentDialog/KpDocumentDialog/SupportDocumentDialog),
// never part of the generated document itself.
export function docInline(parts: (string | { id: string; value: string; width?: string })[]) {
  return `<div style="font-size:11.5px; color:${INK}; line-height:1.7; page-break-inside:avoid; break-inside:avoid;">${parts.map((p) =>
    typeof p === "string" ? esc(p) : `<span style="font-weight:600;">${esc(p.value)}</span>`
  ).join("")}</div>`
}

export function docSignatures(clientCompanyName: string) {
  const block = (label: string, company: string) => `
    <div style="flex:1; border:1px solid ${LINE}; border-radius:10px; padding:12px 14px;">
      <div style="font-size:10px; font-weight:700; color:${INK}; margin-bottom:8px;">${label}</div>
      ${["Kompaniya", "Vakil", "Imzo", "Muhr"].map((l, i) => `
        <div style="display:flex; gap:8px; font-size:11px; color:${MUTED}; margin-bottom:5px;">
          <span style="width:70px; flex-shrink:0;">${l}:</span>
          <span style="flex:1; border-bottom:1px dotted ${LINE}; color:${INK};">${i === 0 ? esc(company) : ""}</span>
        </div>`).join("")}
    </div>`
  return `
  <div style="page-break-inside:avoid; break-inside:avoid;">
    <div style="text-align:center; font-size:9.5px; font-weight:600; letter-spacing:0.08em; color:${FAINT}; margin:18px 0 10px;">TOMONLARNING TASDIG'I</div>
    <div style="display:flex; gap:14px;">${block("BAJARUVCHI", COMPANY_NAME)}${block("BUYURTMACHI", clientCompanyName)}</div>
  </div>`
}

// ---------------------------------------------------------------------------
// Document #1 — "Texnik topshiriq"
// ---------------------------------------------------------------------------

export type TzData = {
  loyihaNomi: string
  faoliyatSohasi: string
  asosiyMahsulot: string
  masulShaxs: string
  aloqaKanali: string
  maqsadlar: string[]
  bizesHolati: { savol: string; javob: string }[]
  aiTizimTuri: string
  vazifalar: string[]
  kanallar: { kanal: string; vazifasi: string; izoh: string }[]
  platformalar: string
  integratsiyaTavsifi: string
  bosqichlar: { nomi: string; manosi: string }[]
  til: string
  ohang: string
  majburiyIboralar: string
  taqiqlanganIboralar: string
  menejergaOtkazish: string
  taqiqlanganHolatlar: string[]
  ishlar: { nomi: string; natija: string }[]
  kirmaydiganIshlar: string[]
  muddat: string
  qabulMezonlari: string[]
  shahar: string
  sana: string
  shartnomaRaqami: string
  clientCompanyName: string
}

export function emptyTzData(): TzData {
  return {
    loyihaNomi: "", faoliyatSohasi: "", asosiyMahsulot: "", masulShaxs: "", aloqaKanali: "",
    maqsadlar: [""], bizesHolati: [{ savol: "", javob: "" }],
    aiTizimTuri: "", vazifalar: [""], kanallar: [{ kanal: "", vazifasi: "", izoh: "" }],
    platformalar: "", integratsiyaTavsifi: "", bosqichlar: [{ nomi: "", manosi: "" }],
    til: "O'zbek", ohang: "", majburiyIboralar: "", taqiqlanganIboralar: "", menejergaOtkazish: "",
    taqiqlanganHolatlar: [], ishlar: [{ nomi: "", natija: "" }], kirmaydiganIshlar: [],
    muddat: "", qabulMezonlari: [""],
    shahar: "", sana: "", shartnomaRaqami: "", clientCompanyName: "",
  }
}

export function renderTzDocHtml(d: TzData): string {
  const s1 = `<div style="display:flex; flex-direction:column; gap:0;">
    ${docFieldRow("Loyiha nomi:", d.loyihaNomi)}
    ${docFieldRow("Buyurtmachi faoliyat sohasi:", d.faoliyatSohasi)}
    ${docFieldRow("Asosiy mahsulot yoki xizmatlar:", d.asosiyMahsulot)}
    ${docFieldRow("Mas'ul shaxs:", d.masulShaxs)}
    ${docFieldRow("Aloqa kanali:", d.aloqaKanali)}
  </div>`
  const s3 = docTable(["Savol", "Buyurtmachi javobi"], d.bizesHolati.map((r) => [r.savol, r.javob]))
  const s6 = docTable(["Kanal", "Vazifasi", "Izoh"], d.kanallar.map((r) => [r.kanal, r.vazifasi, r.izoh]))
  const s8 = `
    <div style="font-size:11.5px; color:${INK}; margin-bottom:10px;">${esc(d.integratsiyaTavsifi)}</div>
    ${docTable(["Bosqich nomi", "Ma'nosi"], d.bosqichlar.map((r) => [r.nomi, r.manosi]))}
  `
  const s9 = docTable(
    ["Parametr", "Tanlov / Izoh"],
    [
      ["Til", d.til], ["Ohang", d.ohang], ["Majburiy iboralar", d.majburiyIboralar],
      ["Taqiqlangan iboralar", d.taqiqlanganIboralar], ["Menejerga o'tkazish shartlari", d.menejergaOtkazish],
    ]
  )
  const s11 = docTable(["№", "Ish nomi", "Natija"], d.ishlar.map((r, i) => [String(i + 1), r.nomi, r.natija]))
  const s13 = `
    ${docFieldRow("Loyiha umumiy muddati:", d.muddat)}
    <div style="margin-top:10px;">${docChecklist(d.qabulMezonlari)}</div>
  `

  const body = [
    docSection(1, "LOYIHA HAQIDA UMUMIY MA'LUMOT", s1),
    docSection(2, "LOYIHA MAQSADI", docBullets(d.maqsadlar)),
    docSection(3, "JORIY BIZNES HOLATI", s3),
    docSection(4, "YASALADIGAN AI TIZIM TURI", `<div style="font-size:11.5px; font-weight:600; color:${INK};">${esc(d.aiTizimTuri)}</div>`),
    docSection(5, "AI TIZIM BAJARADIGAN ASOSIY VAZIFALAR", docNumbered(d.vazifalar)),
    docSection(6, "AI TIZIM ISHLAYDIGAN KANALLAR", s6),
    docSection(7, "INTEGRATSIYA QILINADIGAN PLATFORMALAR", `<div style="font-size:11.5px; color:${INK};">${esc(d.platformalar)}</div>`,
      "Uchinchi tomon platformalarining abonent to'lovi, token xarajatlari, API xarajatlari va boshqa tashqi xarajatlari Buyurtmachi tomonidan alohida to'lanadi."),
    docSection(8, "INTEGRATSIYA LOGIKASI", s8),
    docSection(9, "AI MULOQOT USLUBI", s9),
    docSection(10, "AI JAVOB BERMASLIGI KERAK BO'LGAN HOLATLAR", docBullets(d.taqiqlanganHolatlar)),
    docSection(11, "BAJARILADIGAN ISHLAR RO'YXATI", s11, "Bajaruvchi tomonidan amalga oshiriladigan loyihalashtirish bosqichlari."),
    docSection(12, "LOYIHAGA KIRMAYDIGAN ISHLAR", docBullets(d.kirmaydiganIshlar)),
    docSection(13, "LOYIHA MUDDATI VA QABUL QILISH MEZONLARI", s13,
      "Muddat shartnoma imzolanishi, oldindan to'lov kelib tushishi, zarur ma'lumotlar va kirish ruxsatlari berilishi hamda texnik topshiriq tasdiqlanishidan keyin boshlanadi."),
  ].join("")

  return docPage({
    ilovaLabel: "ILOVA №1 — TEXNIK TOPSHIRIQ",
    projectName: d.loyihaNomi || "—",
    subtitle: `AI INTEGRATSIYA XIZMATLARINI KO'RSATISH SHARTNOMASI ${d.shartnomaRaqami ? `№${d.shartnomaRaqami} ` : ""}GA ILOVA`,
    title: "Texnik topshiriq",
    disclaimer: "Ushbu ilova AI integratsiya xizmatlari bo'yicha asosiy shartnomaning ajralmas qismi hisoblanadi. Hujjat O'zbekiston Respublikasi qonunchiligi talablarini inobatga olgan namunaviy shaklda tayyorlangan. Amaliy foydalanishdan oldin kompaniya rekvizitlari, soliq holati, faoliyat shakli va aniq loyiha shartlariga moslashtirilishi tavsiya etiladi.",
    metaFields: [
      { label: "Shahar", value: d.shahar, editableId: "shahar" },
      { label: "Sana", value: d.sana, editableId: "sana" },
      { label: "Shartnoma raqami", value: d.shartnomaRaqami ? `№${d.shartnomaRaqami}` : "", editableId: "shartnomaRaqami" },
    ],
    bodyHtml: body,
    clientCompanyName: d.clientCompanyName,
  })
}

// ---------------------------------------------------------------------------
// Document #2 — "Tijorat taklifi" (commercial proposal + contract basis, 17 sections)
// ---------------------------------------------------------------------------

export type KpData = {
  buyurtmachiNomi: string
  bajaruvchiNomi: string
  shahar: string
  sana: string
  shartnomaRaqami: string
  // 1. SHARTNOMA PREDMETI
  agentTavsifi: string
  tizimNomi: string
  bolimlar: string
  turi: string
  hisobotTuri: string
  vazifaTavsifi: string
  bosqichSoni: string
  // 2. XIZMATLAR ETAPLARI
  etaplar: { nomi: string; natija: string }[]
  aniqlashtirish: string[]
  // 3. TO'LOV TARTIBI
  umumiyQiymat: string
  toLovBosqichlari: { nomi: string; foiz: string; summa: string }[]
  // 4. TASHQI HARAJATLAR
  qoshimchaXarajatlar: string
  // 5. MUDDAT VA KECHIKISHLAR
  muddat: string
  boshlanishSana: string
  tugashSana: string
  kechikishSabablari: string
  // 7. BUYURTMACHINING MAJBURIYATLARI
  tizimlarRoyxati: string
  // 8. ISHNI QABUL QILISH
  qabulMisollari: string
  // 12. TEXNIK QO'LLAB-QUVVATLASH
  tashqiXizmatlarQQ: string
  // 15. FORS-MAJOR VA NIZOLAR
  sudShahri: string
  // 17. MIJOZ UCHUN XIZMAT NARXIDAN TASHQARI BONUSLAR
  bonuslar: string[]
}

export function emptyKpData(): KpData {
  return {
    buyurtmachiNomi: "", bajaruvchiNomi: COMPANY_NAME, shahar: "", sana: "", shartnomaRaqami: "",
    agentTavsifi: "", tizimNomi: "", bolimlar: "", turi: "agent", hisobotTuri: "", vazifaTavsifi: "", bosqichSoni: "2",
    etaplar: [{ nomi: "", natija: "" }], aniqlashtirish: [""],
    umumiyQiymat: "", toLovBosqichlari: [{ nomi: "", foiz: "", summa: "" }],
    qoshimchaXarajatlar: "", muddat: "", boshlanishSana: "", tugashSana: "", kechikishSabablari: "",
    tizimlarRoyxati: "", qabulMisollari: "", tashqiXizmatlarQQ: "", sudShahri: "",
    bonuslar: ["1 oy bepul texnik qo'llab-quvvatlash.", "Taqdim etilayotgan AI yechimlaridan foydalanish uchun videodarslik."],
  }
}

export function renderKpDocHtml(d: KpData): string {
  const s1 = `<div style="display:flex; flex-direction:column; gap:10px;">
    ${docInline([
      "1.1. Bajaruvchi Buyurtmachiga ", { id: "agentTavsifi", value: d.agentTavsifi, width: "220px" },
      " integratsiyasini taqdim etadi. ", { id: "tizimNomi", value: d.tizimNomi, width: "60px" },
      " tizimining ", { id: "bolimlar", value: d.bolimlar, width: "140px" }, " bo'limlariga tegishli ma'lumotlarni kiritadi.",
    ])}
    ${docInline([
      "1.2. AI", { id: "turi", value: d.turi, width: "70px" }, " quyidagi funksiyalarni bajaradi: ", { id: "hisobotTuri", value: d.hisobotTuri, width: "160px" },
      " bo'yicha hisobotlar taqdim etadi, ", { id: "vazifaTavsifi", value: d.vazifaTavsifi, width: "260px" }, ".",
    ])}
    ${docInline([
      "1.3. Xizmat ", { id: "bosqichSoni", value: d.bosqichSoni, width: "24px" },
      " bosqichga bo'lingan. Ushbu shartnoma barcha bosqichlarni ham qamrab oladi (2-bandda batafsil).",
    ])}
    <div style="font-size:11.5px; color:${INK}; line-height:1.7;">1.4. Texnik topshiriqda ko'rsatilmagan qo'shimcha ish yoki qo'shimcha talab har doim yozma kelishuv va alohida haq evaziga bajariladi. Qo'shimcha ish loyiha narxi, muddati va texnik arxitekturaga ta'sir qilishi mumkin. Biroq Bajaruvchi o'z ixtiyori bilan qaror bo'lib, ayrim kichik qo'shimcha funksiyalar uchun alohida to'lov almasligi mumkin.</div>
  `
  const s2 = `
    ${docTable(["№", "BAJARILADIGAN ISH", "NATIJA"], d.etaplar.map((r, i) => [String(i + 1), r.nomi, r.natija]))}
    <div style="margin-top:12px; background:${HEAD_BG}; border-radius:8px; padding:10px 12px; page-break-inside:avoid; break-inside:avoid;">
      <div style="font-size:9px; font-weight:700; letter-spacing:0.06em; color:${MUTED}; margin-bottom:6px;">MA'LUMOTLARNI ANIQLASHTIRISH</div>
      ${docBullets(d.aniqlashtirish)}
    </div>
  `
  const s3 = `
    ${docInline(["3.1. Umumiy qiymati: ", { id: "umumiyQiymat", value: d.umumiyQiymat, width: "220px" }, "."])}
    <div style="margin-top:8px;">${docTable(["№", "TO'LOV BOSQICHI", "MIQDORI", "SUMMA"], d.toLovBosqichlari.map((r, i) => [String(i + 1), r.nomi, r.foiz, r.summa]))}</div>
    <div style="font-size:11.5px; color:${INK}; line-height:1.7; margin-top:8px;">
      3.2. To'lov belgilangan sanada amalga oshirilishi shart. Tegishli to'lov tushmaguncha Bajaruvchi ishni to'xtatib turish huquqiga ega.<br/>
      3.3. Boshlangan bosqich uchun to'langan mablag' qaytarilmaydi, chunki Bajaruvchi vaqt, tajriba va texnik resurs sarflagan.<br/>
      3.4. Agar ishlar boshlanmasdan shartnoma bekor bo'lsa, boshlang'ich to'lovning 70% Buyurtmachiga 10 ish kuni ichida qaytariladi.<br/>
      3.5. Qo'shimcha ishlar alohida hisob-kitob asosida bajariladi. Bajaruvchi qo'shimcha ishni boshlashdan oldin taxminiy narx va muddatni Buyurtmachiga ma'lum qiladi.
    </div>
  `
  const s4 = `<div style="display:flex; flex-direction:column; gap:8px;">
    ${docInline([
      "4.1. Quyidagi xarajatlar Bajaruvchi xizmat narxiga kirmaydi: AI model tokenlari, ", { id: "qoshimchaXarajatlar", value: d.qoshimchaXarajatlar, width: "180px" }, ", hosting va server, boshqa SaaS platformalar.",
    ])}
    <div style="font-size:11.5px; color:${INK}; line-height:1.7;">
      4.2. Buyurtmachi uchinchi tomon platformalariga o'z hisobidan to'laydi.<br/>
      4.3. Bajaruvchi uchinchi tomon platformalarining narx o'zgarishi, blokdlash, ishlamay qolishi, texnik xatosi yoki siyosat o'zgarishi uchun javobgar emas.
    </div>
  </div>`
  const s5 = `<div style="display:flex; flex-direction:column; gap:10px;">
    ${docInline([
      "5.1. Umumiy loyiha muddati: ", { id: "muddat", value: d.muddat, width: "90px" }, " — ",
      { id: "boshlanishSana", value: d.boshlanishSana, width: "90px" }, " dan ", { id: "tugashSana", value: d.tugashSana, width: "90px" },
      " gacha. Muddat quyidagi shartlar bajarilgan kundan boshlab hisoblanadi: shartnoma imzolangan, boshlang'ich to'lov amalga oshirilgan, zarur ma'lumot va kirish ruxsatlari berilgan, texnik topshiriq tasdiqlangan.",
    ])}
    ${docInline([
      "5.2. Quyidagi holatlarda loyiha muddati avtomatik uzaytiriladi: Buyurtmachi to'lovni kechiktirsa; ", { id: "kechikishSabablari", value: d.kechikishSabablari, width: "260px" },
      "; uchinchi tomon platformalarida nosozlik yuzaga kelsa. Buyurtmachi 5 (besh) ish kuni davomida javob bermasa yoki kerakli ma'lumotni bermasa, loyiha vaqtincha to'xtatilishi mumkin. Bu davr uchun Bajaruvchi muddat kechikishiga javobgar bo'lmaydi.",
    ])}
    <div style="font-size:11.5px; color:${INK}; line-height:1.7;">5.3. Buyurtmachi 5 (besh) ish kuni davomida javob bermasa yoki kerakli ma'lumotni bermasa, loyiha vaqtincha to'xtatilishi mumkin. Bu davr uchun Bajaruvchi muddat kechikishiga javobgar bo'lmaydi.</div>
  </div>`
  const s6 = `<div style="font-size:11.5px; color:${INK}; line-height:1.9;">
    <div style="font-size:9.5px; font-weight:700; color:${MUTED}; margin-bottom:6px;">BAJARUVCHI MAJBUR:</div>
    6.1. Xizmatlarni professional darajada, kelishilgan texnik topshiriq asosida bajarish.<br/>
    6.2. Buyurtmachining biznes jarayonlarini o'rganib, unga mos AI yechim taklif qilish.<br/>
    6.3. AI tizimini sozlash, integratsiya qilish, test qilish va ishga tushirish.<br/>
    6.4. O'z aybi bilan yuzaga kelgan texnik kamchiliklarni qo'llab-quvvatlash muddati ichida tuzatish.<br/>
    6.5. Buyurtmachining maxfiy ma'lumotlarini uchinchi shaxslarga oshkor qilmaslik.<br/>
    6.6. Buyurtmachi so'ragan o'zgarishlar muddat, narx yoki murakkablikka ta'sir qilsa, bu haqda oldindan xabar berish.
    <div style="font-size:9.5px; font-weight:700; color:${MUTED}; margin:10px 0 6px;">BAJARUVCHI HUQUQLI:</div>
    6.7. To'lovni o'z vaqtida to'liq talab qilish. To'lov kechiksa — ishni vaqtinchalik to'xtatib turish.<br/>
    6.8. Xizmatni bajarish uchun zarur bo'lgan barcha ma'lumot, kirish huquqlari va API kalitlarini Buyurtmachidan talab qilish.<br/>
    6.9. Buyurtmachi sababli yuzaga kelgan kechikishlar uchun muddatlarini uzaytirish.<br/>
    6.10. Dastlabki kelishuvga kiritilmagan ishlarni bepul bajarmaslik — biroq Bajaruvchi o'z xohishiga ko'ra ayrim kichik qo'shimcha ishlarni bepul bajarishi mumkin.<br/>
    6.11. Zarurat bo'lsa, loyiha uchun dasturchi yoki boshqa mutaxassislarni jalb qilish.<br/>
    6.12. O'zining metodologiyasi, shablonlari va texnik yechimlaridan boshqa loyihalarda ham foydalanish.<br/>
    6.13. Buyurtmachining ruxsati bilan loyiha natijasini portfolio yoki keys sifatida ko'rsatish.<br/>
    6.14. Aniq miqdorda sotuv, foyda yoki daromad kafolatlanmaydi — natija taqdim etilgan ma'lumot sifati va Buyurtmachi boshqaruviga ham bog'liq.
  </div>`
  const s7 = `<div style="font-size:11.5px; color:${INK}; line-height:1.9;">
    <div style="font-size:9.5px; font-weight:700; color:${MUTED}; margin-bottom:6px;">BUYURTMACHI MAJBUR:</div>
    ${docInline(["7.1. Loyiha uchun zarur ma'lumotlar, login-parollar, API kalitlari (", { id: "tizimlarRoyxati", value: d.tizimlarRoyxati, width: "140px" }, ") to'liq, aniq va o'z vaqtida taqdim etish."])}
    7.2. Kerakli platformalar va akkauntlarga kirish ruxsatlarini taqdim etish.<br/>
    7.3. Loyiha bo'yicha bitta mas'ul shaxs tayinlash.<br/>
    7.4. Loyiha bo'yicha materiallarni, test natijalarini va bajarilgan ishlarni 3 (uch) ish kuni ichida ko'rib chiqish va tasdiqlash. Agar Buyurtmachi ushbu muddat ichida yozma e'tiroz bildirmasa, ish avtomatik tasdiqlangan hisoblanadi.<br/>
    7.5. To'lovlarni belgilangan sanalarda amalga oshirish, uchinchi tomon tashqi xarajatlarini mustaqil to'lash.<br/>
    7.6. AI tizimidan mas'uliyat bilan foydalanish, xodimlarga to'g'ri tushuntirish.<br/>
    7.7. Loyiha davomida Bajaruvchi bilan kelishmasdan integratsiyalarni yoki sozlamalarni o'zgartirmaslik.<br/>
    7.8. Bajaruvchiga berilgan ma'lumotlarning to'g'riligi va to'liqligi uchun javobgar.
    <div style="font-size:9.5px; font-weight:700; color:${MUTED}; margin:10px 0 6px;">BUYURTMACHI HUQUQLI:</div>
    7.9. Kelishilgan xizmatlarni texnik topshiriq doirasida olish.<br/>
    7.10. Loyiha jarayoni bo'yicha ma'lumot so'rash.<br/>
    7.11. Tizimni ishga tushirishdan oldin test qilish.<br/>
    7.12. Bajaruvchi aybi bilan yuzaga kelgan texnik xatolarni muddat ichida tuzatishni talab qilish.<br/>
    7.13. Qo'shimcha funksiya yoki integratsiyani alohida haq evaziga buyurtma qilish.
  </div>`
  const s8 = `<div style="font-size:11.5px; color:${INK}; line-height:1.9;">
    8.1. Bajaruvchi har bir bosqich bo'yicha Buyurtmachiga demo, havola, test muhiti yoki boshqa tasdiqlovchi material taqdim etadi.<br/>
    8.2. Buyurtmachi bajarilgan ishni 3 (uch) ish kuni ichida ko'rib chiqishi kerak. Agar ushbu muddat ichida yozma e'tiroz bildirmasa, ish qabul qilingan hisoblanadi.<br/>
    8.3. E'tirozlar aniq, asosli va kelishilgan texnik topshiriq doirasida bo'lishi kerak.<br/>
    ${docInline(["8.4. Quyidagilar kamchilik hisoblanmaydi: Buyurtmachining fikri o'zgarishi; texnik topshiriqda bo'lmagan yangi funksiya so'ralishi; ", { id: "qabulMisollari", value: d.qabulMisollari, width: "260px" }, " yoki tushunarsiz bo'lgani sababli AI-agent aniqlashtiruvchi savol bergani."])}
    8.5. Yakuniy kirish ruxsatlari va hujjatlar faqat to'liq to'lovdan keyin taqdim etiladi.<br/>
    8.6. Bajaruvchi bajarilgan ish haqida Buyurtmachi bilan onlayn uchrashuv qilib, ishni tasdiqlab qabul qilib olishi kerak.
  </div>`
  const s9 = `<div style="font-size:11.5px; color:${INK}; line-height:1.9;">
    9.1. Sun'iy intellekt texnologiyasi ehtimollik asosida ishlashini tushunadi.<br/>
    9.2. AI mutlaqo ideal javob beradi deb inson qarorini to'liq almashtirilmaydi. Moliyaviy jihatdan muhim qarorlarni Buyurtmachi nazorat qilishi shart.<br/>
    ${docInline(["9.3. AI tizimi sifati Buyurtmachining taqdim etilgan ma'lumotlari (", { id: "tizimlarRoyxati", value: d.tizimlarRoyxati, width: "140px" }, ")ning to'liqligiga bog'liq. Noto'g'ri yoki yetarli bo'lmagan ma'lumot berilsa, AI javoblaridagi xatolar uchun Buyurtmachi javobgar emas."])}
    9.4. AI yordamchi va tahlil qiluvchi vosita sifatida ishlatiladi. Uni nazoratsiz, to'liq mustaqil qaror qabul qiluvchi vosita sifatida ishlatish tavsiya etilmaydi.
  </div>`
  const s10 = `<div style="font-size:11.5px; color:${INK}; line-height:1.9;">
    10.1. Tomonlar hamkorlik davomida olingan barcha biznes, moliyaviy va texnik ma'lumotlarni uchinchi shaxslarga oshkor qilmaydi.<br/>
    10.2. Maxfiylik majburiyati shartnoma tugagandan keyin ham 3 (uch) yil davomida amal qiladi.<br/>
    10.3. Bajaruvchining oldindan mavjud metodologiyasi, prompt shablonlari va nou-xau Bajaruvchi mulki bo'lib qoladi.<br/>
    10.4. Buyurtmachi to'liq to'lovdan keyin AI tizimidan o'z biznesida foydalanish huquqiga ega. Ammo Bajaruvchining ichki metodologiyasi va nou-xaudagi eksklyuziv huquq olmaydi. Loyihadan faqat Buyurtmachi foydalanishi mumkin. Qayta sotish taqiqlanadi.<br/>
    10.5. Buyurtmachi Bajaruvchining integratsiya yechimi yoki uchinchi shaxslarga sotishi, nusxalashi yoki tarqatishga haqli emas. Ushbu band buzilgani aniqlansa, Buyurtmachi shartnoma qiymatining 100% miqdorida jarima to'laydi.
  </div>`
  const s11 = `<div style="font-size:11.5px; color:${INK}; line-height:1.9;">
    11.1. Bajaruvchi Buyurtmachi ma'lumotlaridan faqat loyiha bajarish maqsadida foydalanadi.<br/>
    11.2. Bajaruvchi quyidagi holatlar uchun javobgar emas: Buyurtmachi xodimlari sababli ma'lumot yo'qolishi; ibox platformasida nosozlik; zaif parol; akkauntga ruxsatsiz kirish; Bajaruvchi bilan kelishilmagan texnik o'zgarishlar.<br/>
    11.3. Ma'lumotlar zaxira nusxasini saqlash Buyurtmachi zimmasida, agar bekor xizmat alohida kelishilgan bo'lsa.
  </div>`
  const s12 = `<div style="font-size:11.5px; color:${INK}; line-height:1.9;">
    12.1. Loyiha topshirilgandan keyin 30 (o'ttiz) kalendar kun davomida bepul texnik qo'llab-quvvatlash amalga oshiriladi. Xatolarni tuzatish, mijoz bilan aloqada bo'lish, tizimdan foydalanishni o'rgatish.<br/>
    ${docInline(["12.2. Tashqi xizmatlar (", { id: "tashqiXizmatlarQQ", value: d.tashqiXizmatlarQQ, width: "180px" }, ") uchun xarajatlarni Buyurtmachi loyiha boshidanoq o'zi to'laydi."])}
    12.3. Ushbu muddatdan keyingi qo'llab-quvvatlash alohida oylik xizmat sifatida rasmiylashtiriladi.<br/>
    12.4. Qo'llab-quvvatlashga kirmaydi: yangi funksiya yasash, yangi integratsiya ulash, katta hajmdagi qayta ishlash — bular alohida kelishuv asosida bajariladi.
  </div>`
  const s13 = `<div style="font-size:11.5px; color:${INK}; line-height:1.9;">
    13.1. Bajaruvchining ushbu shartnoma bo'yicha umumiy javobgarligi amalda to'langan summa miqdoridan oshmaydi.<br/>
    13.2. Bajaruvchi yo'qotilgan foyda, yo'qotilgan sotuv, mijozlar ketishi yoki biznes ko'rsatkichlari sababli zarar uchun javobgar emas.<br/>
    13.3. Kafolat quyidagi hollarda qo'llanilmaydi: uchinchi tomon platformalari nosozligi; API o'zgarishi; token yoki obuna to'lovi qilinmagani; Buyurtmachi tizimni o'zgartirgani.<br/>
    13.4. Buyurtmachi yoki uchinchi shaxs Bajaruvchi bilan kelishmasdan tizimga o'zgartirish kiritsa, kafolat majburiyati bekor qilinadi.<br/>
    13.5. Aniq miqdorda sotuv yoki daromad natijasi kafolatlanmaydi — bu taqdim etilgan ma'lumot sifati va Buyurtmachi boshqaruviga ham bog'liq.
  </div>`
  const s14 = `<div style="font-size:11.5px; color:${INK}; line-height:1.9;">
    14.1. Har bir Tomon 14 (o'n to'rt) kalendar kun oldin yozma ogohlantirib shartnomani bekor qilishi mumkin.<br/>
    14.2. Bekor qilish bajarilgan ish uchun to'lov majburiyatidan ozod qilmaydi.<br/>
    14.3. Qarzdorlik mavjud bo'lsa, yakuniy topshiriq to'liq to'lov amalga oshirilguncha to'xtatiladi.<br/>
    14.4. Bajaruvchi ishni to'xtatishi mumkin: to'lov kechiksa; zarur ma'lumotlar yoki ruxsatlar berilmasa; texnik topshiriqdan tashqari ish bepul talab qilinsa.<br/>
    14.5. Noaniq topshiriqlar, kech javoblar yoki qaror-qarshiliklar sababli yuzaga kelgan kechikishlar uchun Bajaruvchi javobgar emas.
  </div>`
  const s15 = `<div style="font-size:11.5px; color:${INK}; line-height:1.9;">
    15.1. Tomonlar o'ziga bog'liq bo'lmagan holatlar (tabiiy ofat, davlat cheklovlari, internet uzilishi, server nosozligi, kiber hujum, qonunchilikdagi kutilmagan o'zgarishlar) sababli javobgarlikdan ozod etiladi.<br/>
    15.2. Fors-major 30 (o'ttiz) kundan ortiq davom etsa, har bir Tomon shartnomani bekor qilish huquqiga ega — bajarilgan ishlar uchun hisob-kitob qilinadi.<br/>
    ${docInline(["15.3. Nizolar avval muzokara orqali hal qilinadi. Yozma da'voga 10 (o'n) ish kuni ichida javob beriladi. Natija bo'lmasa — ", { id: "sudShahri", value: d.sudShahri, width: "100px" }, " shahar sudi vakolatli."])}
  </div>`
  const s16 = `<div style="font-size:11.5px; color:${INK}; line-height:1.9;">
    16.1. Shartnoma imzolangan kundan kuchga kiradi va majburiyatlar to'liq bajarilgunicha amal qiladi.<br/>
    16.2. Ilovalar, texnik topshiriq va yozma tasdiqlar shartnomaning ajralmas qismi.<br/>
    16.3. Har qanday o'zgartirish yozma shaklda rasmiylashtiriladi.<br/>
    16.4. Shartnoma ERI yoki yozma imzo orqali tasdiqlanishi mumkin — ikki nusxada, teng yuridik kuchga ega.<br/>
    16.5. Muhim qarorlar, tasdiqlar va e'tirozlar yozma shaklda berilishi kerak.
  </div>`
  const s17 = docNumbered(d.bonuslar)

  const body = [
    docSection(1, "SHARTNOMA PREDMETI", s1),
    docSection(2, "XIZMATLAR ETAPLARI", s2),
    docSection(3, "TO'LOV TARTIBI", s3),
    docSection(4, "TASHQI HARAJATLAR", s4),
    docSection(5, "MUDDAT VA KECHIKISHLAR", s5),
    docSection(6, "BAJARUVCHINING MAJBURIYATLARI VA HUQUQLARI", s6),
    docSection(7, "BUYURTMACHINING MAJBURIYATLARI VA HUQUQLARI", s7),
    docSection(8, "ISHNI QABUL QILISH TARTIBI", s8),
    docSection(9, "AI TEXNOLOGIYASI CHEKLOVLARI", s9),
    docSection(10, "MAXFIYLIK VA INTELLEKTUAL MULK", s10),
    docSection(11, "MA'LUMOTLAR VA XAVFSIZLIK", s11),
    docSection(12, "TEXNIK QO'LLAB-QUVVATLASH", s12),
    docSection(13, "JAVOBGARLIK VA KAFOLAT", s13),
    docSection(14, "SHARTNOMANI BEKOR QILISH VA TO'XTATISH", s14),
    docSection(15, "FORS-MAJOR VA NIZOLAR", s15),
    docSection(16, "YAKUNIY QOIDALAR", s16),
    docSection(17, "MIJOZ UCHUN XIZMAT NARXIDAN TASHQARI BONUSLAR", s17),
  ].join("")

  return docPage({
    ilovaLabel: "TIJORAT TAKLIFI VA SHARTNOMA ASOSLARI",
    projectName: d.buyurtmachiNomi || "—",
    subtitle: "AI INTEGRATSIYA XIZMATLARI SHARTNOMASIGA ASOS",
    title: `${d.buyurtmachiNomi || "Mijoz"} uchun AI integratsiya xizmatlari uchun shartnoma`,
    disclaimer: `Bir tomondan ${d.bajaruvchiNomi || COMPANY_NAME}, keyingi o'rinlarda "Bajaruvchi" deb yuritiladi, ikkinchi tomondan ${d.buyurtmachiNomi || "Mijoz"}, keyingi o'rinlarda "Buyurtmachi" deb yuritilib, birgalikda "Tomonlar" deb, ushbu hujjatni tayyorladilar.`,
    metaFields: [
      { label: "Shahar", value: d.shahar, editableId: "shahar" },
      { label: "Sana", value: d.sana, editableId: "sana" },
      { label: "Shartnoma raqami", value: d.shartnomaRaqami ? `№${d.shartnomaRaqami}` : "", editableId: "shartnomaRaqami" },
      { label: "Bajaruvchi", value: d.bajaruvchiNomi, editableId: "bajaruvchiNomi" },
      { label: "Buyurtmachi", value: d.buyurtmachiNomi, editableId: "buyurtmachiNomi" },
    ],
    bodyHtml: body,
    clientCompanyName: d.buyurtmachiNomi,
  })
}

export function docPage(opts: {
  ilovaLabel: string
  projectName: string
  clientLogoUrl?: string | null
  subtitle: string
  title: string
  disclaimer?: string
  metaFields: { label: string; value: string; editableId?: string }[]
  bodyHtml: string
  clientCompanyName: string
  signaturesHtml?: string
  footerHtml?: string
}) {
  return `
  <div style="font-family:${FONT}; color:${INK}; background:#fff;">
    <div style="width:210mm; min-height:297mm; margin:0 auto; padding:14mm 16mm; background:#fff; box-sizing:border-box;">
      ${docHeader({ ilovaLabel: opts.ilovaLabel, projectName: opts.projectName, clientLogoUrl: opts.clientLogoUrl })}
      ${docTitleBlock(opts.subtitle, opts.title)}
      ${opts.disclaimer ? `<div style="background:${HEAD_BG}; border-radius:10px; padding:10px 14px; font-size:10px; color:${MUTED}; margin-bottom:14px; line-height:1.5;">${esc(opts.disclaimer)}</div>` : ""}
      ${docMetaRow(opts.metaFields)}
      ${opts.bodyHtml}
      ${opts.signaturesHtml ?? docSignatures(opts.clientCompanyName)}
      ${opts.footerHtml ?? ""}
    </div>
  </div>`
}

// ---------------------------------------------------------------------------
// Document #3 — "Texnik qo'llab-quvvatlash shartlari" (support terms appendix)
// ---------------------------------------------------------------------------

export type SupportData = {
  shartnomaRaqami: string
  ilovaRaqami: string
  shahar: string
  sana: string
  masulShaxslar: string
  buyurtmachiNomi: string
  clientLogoUrl: string
  muddatKun: string
  muddatBoshlanish: string
  muddatTugash: string
  tanlanganPaket: string
  kiradi: string[]
  kirmaydi: string[]
  javobVaqti: string
  kirmaydiganHolatlar: string[]
}

export function emptySupportData(): SupportData {
  return {
    shartnomaRaqami: "", ilovaRaqami: "", shahar: "", sana: "", masulShaxslar: "", buyurtmachiNomi: "", clientLogoUrl: "",
    muddatKun: "", muddatBoshlanish: "", muddatTugash: "", tanlanganPaket: "",
    kiradi: [], kirmaydi: [], javobVaqti: "", kirmaydiganHolatlar: [],
  }
}

export function renderSupportDocHtml(d: SupportData): string {
  const s1 = docInline([
    "Bepul qo'llab-quvvatlash muddati — ", { id: "muddatKun", value: d.muddatKun, width: "40px" },
    " kun, ya'ni ", { id: "muddatBoshlanish", value: d.muddatBoshlanish, width: "100px" },
    " — ", { id: "muddatTugash", value: d.muddatTugash, width: "100px" },
    " oralig'ida amal qiladi. Ushbu muddat tugaganidan so'ng texnik qo'llab-quvvatlash tomonlar kelishuviga asosan alohida xizmat sifatida davom ettirilishi mumkin.",
  ])
  const s2 = `<div style="font-size:11.5px; color:${INK}; line-height:1.6;">${esc(d.tanlanganPaket)}</div>`
  const s3 = `<div style="display:flex; gap:14px;">
    <div style="flex:1; border:1px solid ${LINE}; border-radius:10px; padding:10px 12px; page-break-inside:avoid; break-inside:avoid;">
      <div style="font-size:9px; font-weight:700; letter-spacing:0.05em; color:${MUTED}; margin-bottom:6px;">BEPUL QO'LLAB-QUVVATLASHGA KIRADI</div>
      <div style="display:flex; flex-direction:column; gap:5px;">${d.kiradi.map((it) => `
        <div style="display:flex; gap:6px; font-size:11.5px; color:${INK};"><span style="color:${MUTED};">+</span><span style="flex:1;">${esc(it)}</span></div>`).join("")}</div>
    </div>
    <div style="flex:1; border:1px solid ${LINE}; border-radius:10px; padding:10px 12px; page-break-inside:avoid; break-inside:avoid;">
      <div style="font-size:9px; font-weight:700; letter-spacing:0.05em; color:${MUTED}; margin-bottom:6px;">BEPUL QO'LLAB-QUVVATLASHGA KIRMAYDI</div>
      <div style="display:flex; flex-direction:column; gap:5px;">${d.kirmaydi.map((it) => `
        <div style="display:flex; gap:6px; font-size:11.5px; color:${INK};"><span style="color:${MUTED};">–</span><span style="flex:1;">${esc(it)}</span></div>`).join("")}</div>
    </div>
  </div>`
  const s4 = docInline(["Murojaatlarga ", { id: "javobVaqti", value: d.javobVaqti, width: "70px" }, " davomida javob beriladi."])
  const s5 = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">${d.kirmaydiganHolatlar.map((it) => `
    <div style="border:1px solid ${LINE}; border-radius:8px; padding:8px 10px; font-size:11px; color:${INK}; page-break-inside:avoid; break-inside:avoid;">${esc(it)}</div>`).join("")}</div>`

  const partiesRow = `<div style="display:flex; gap:14px; margin-bottom:16px; page-break-inside:avoid; break-inside:avoid;">
    <div style="flex:1; border:1px solid ${LINE}; border-radius:10px; padding:10px 14px;">
      <div style="font-size:8.5px; font-weight:600; letter-spacing:0.06em; color:${FAINT}; margin-bottom:3px;">BAJARUVCHI</div>
      <div style="font-size:12.5px; font-weight:600; color:${INK};">${esc(COMPANY_NAME)}</div>
      <div style="font-size:10px; color:${MUTED}; margin-top:2px;">Mas'ul shaxslar: ${esc(d.masulShaxslar)}</div>
    </div>
    <div style="flex:1; border:1px solid ${LINE}; border-radius:10px; padding:10px 14px;">
      <div style="font-size:8.5px; font-weight:600; letter-spacing:0.06em; color:${FAINT}; margin-bottom:3px;">BUYURTMACHI</div>
      <div style="font-size:12.5px; font-weight:600; color:${INK};">${esc(d.buyurtmachiNomi)}</div>
      <div style="font-size:10px; color:${MUTED}; margin-top:2px;">Mijoz kompaniyasi</div>
    </div>
  </div>`

  const body = [
    partiesRow,
    docSection(1, "Qo'llab-quvvatlash muddati", s1),
    docSection(2, "Tanlangan paket", s2),
    docSection(3, "Xizmat doirasi", s3),
    docSection(4, "Javob berish vaqti", s4),
    docSection(5, "Texnik qo'llab-quvvatlashga kirmaydigan holatlar", s5),
  ].join("")

  const signatures = `
  <div style="page-break-inside:avoid; break-inside:avoid;">
    <div style="text-align:center; font-size:9.5px; font-weight:600; letter-spacing:0.08em; color:${FAINT}; margin:18px 0 10px;">TOMONLARNING IMZOLARI</div>
    <div style="display:flex; gap:14px;">
      ${["BAJARUVCHI", "BUYURTMACHI"].map((label) => `
      <div style="flex:1; border:1px solid ${LINE}; border-radius:10px; padding:12px 14px;">
        <div style="font-size:10px; font-weight:700; color:${INK}; margin-bottom:8px;">${label}</div>
        ${["F.I.Sh. / Kompaniya", "Vakil", "Imzo", "Muhr"].map((l, i) => `
          <div style="display:flex; gap:8px; font-size:11px; color:${MUTED}; margin-bottom:5px;">
            <span style="width:90px; flex-shrink:0;">${l}:</span>
            <span style="flex:1; border-bottom:1px dotted ${LINE}; color:${INK};">${i === 0 ? esc(label === "BAJARUVCHI" ? COMPANY_NAME : d.buyurtmachiNomi) : ""}</span>
          </div>`).join("")}
      </div>`).join("")}
    </div>
  </div>`

  return docPage({
    ilovaLabel: "",
    projectName: "",
    clientLogoUrl: d.clientLogoUrl || null,
    subtitle: "AI INTEGRATSIYA XIZMATLARI SHARTNOMASIGA ILOVA",
    title: "Texnik qo'llab-quvvatlash shartlari",
    disclaimer: "Ushbu ilova AI integratsiya xizmatlari bo'yicha asosiy shartnomaning ajralmas qismi hisoblanadi va tomonlar o'rtasidagi texnik qo'llab-quvvatlash shartlarini belgilaydi.",
    metaFields: [
      { label: "Shartnoma raqami", value: d.shartnomaRaqami ? `№${d.shartnomaRaqami}` : "", editableId: "shartnomaRaqami" },
      { label: "Ilova raqami", value: d.ilovaRaqami ? `№${d.ilovaRaqami}` : "", editableId: "ilovaRaqami" },
      { label: "Shahar", value: d.shahar, editableId: "shahar" },
      { label: "Sana", value: d.sana, editableId: "sana" },
    ],
    bodyHtml: body,
    clientCompanyName: d.buyurtmachiNomi,
    signaturesHtml: signatures,
  })
}
