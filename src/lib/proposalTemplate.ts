import { formatMoney, formatDate } from "@/lib/utils"

const SUPPORT_TIER_LABEL: Record<string, string> = {
  bepul: "Bepul",
  start: "Start",
  pro: "Pro",
  max: "Max",
}
const PAYMENT_TYPE_LABEL: Record<string, string> = {
  bir_martalik: "Bir martalik to‘lov",
  bolib_tolash: "Bo‘lib to‘lash",
}

type KpInput = {
  projectName: string
  companyName: string | null
  clientContactName: string | null
  amount: number | null
  paymentType: string | null
  installmentsCount: number | null
  paymentStages: { title: string; amount: number; due_date: string | null }[]
}

export function renderProposalHtml(p: KpInput): string {
  const stagesRows = p.paymentStages.length
    ? p.paymentStages
        .map(
          (s) => `<tr>
            <td style="padding:10px 14px;border-bottom:1px solid #e8e6e1;">${s.title}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e8e6e1;text-align:right;">${formatMoney(s.amount)}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e8e6e1;text-align:right;">${s.due_date ? formatDate(s.due_date) : "—"}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="3" style="padding:14px;color:#9a98a0;">To‘lov bosqichlari kiritilmagan</td></tr>`

  return `
  <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color:#17161b; max-width:720px; margin:0 auto; padding:32px;">
    <div style="margin-bottom:28px;">
      <div style="font-size:13px; letter-spacing:2px; text-transform:uppercase; color:#5b5bf6; font-weight:600;">Kommersiya taklifi</div>
      <h1 style="font-size:28px; margin:8px 0 0; font-weight:800;">${p.projectName}</h1>
      ${p.companyName ? `<div style="color:#6b6a70; margin-top:4px;">${p.companyName}${p.clientContactName ? " · " + p.clientContactName : ""}</div>` : ""}
    </div>

    <div style="display:flex; gap:24px; margin-bottom:28px;">
      <div>
        <div style="font-size:12px; color:#9a98a0; text-transform:uppercase; letter-spacing:1px;">Umumiy summa</div>
        <div style="font-size:20px; font-weight:700; margin-top:4px;">${p.amount != null ? formatMoney(p.amount) : "—"}</div>
      </div>
      <div>
        <div style="font-size:12px; color:#9a98a0; text-transform:uppercase; letter-spacing:1px;">To‘lov turi</div>
        <div style="font-size:20px; font-weight:700; margin-top:4px;">${p.paymentType ? PAYMENT_TYPE_LABEL[p.paymentType] ?? p.paymentType : "—"}</div>
      </div>
      ${
        p.paymentType === "bolib_tolash" && p.installmentsCount
          ? `<div><div style="font-size:12px; color:#9a98a0; text-transform:uppercase; letter-spacing:1px;">Qismlar soni</div><div style="font-size:20px; font-weight:700; margin-top:4px;">${p.installmentsCount}</div></div>`
          : ""
      }
    </div>

    <h3 style="font-size:15px; margin-bottom:10px;">To‘lov bosqichlari</h3>
    <table style="width:100%; border-collapse:collapse; font-size:14px;">
      <thead>
        <tr>
          <th style="text-align:left; padding:8px 14px; color:#9a98a0; font-size:12px; text-transform:uppercase;">Bosqich</th>
          <th style="text-align:right; padding:8px 14px; color:#9a98a0; font-size:12px; text-transform:uppercase;">Summa</th>
          <th style="text-align:right; padding:8px 14px; color:#9a98a0; font-size:12px; text-transform:uppercase;">Muddat</th>
        </tr>
      </thead>
      <tbody>${stagesRows}</tbody>
    </table>
  </div>`
}

type SupportInput = {
  projectName: string
  companyName: string | null
  supportTier: string
  supportMonths: number | null
}

export function renderSupportHtml(p: SupportInput): string {
  return `
  <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color:#17161b; max-width:720px; margin:0 auto; padding:32px;">
    <div style="margin-bottom:24px;">
      <div style="font-size:13px; letter-spacing:2px; text-transform:uppercase; color:#5b5bf6; font-weight:600;">Texnik qo‘llab-quvvatlash</div>
      <h1 style="font-size:28px; margin:8px 0 0; font-weight:800;">${p.projectName}</h1>
      ${p.companyName ? `<div style="color:#6b6a70; margin-top:4px;">${p.companyName}</div>` : ""}
    </div>

    <div style="background:#f4f3f1; border-radius:14px; padding:20px 24px;">
      <div style="font-size:12px; color:#9a98a0; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px;">Tarif</div>
      <div style="font-size:20px; font-weight:700;">${SUPPORT_TIER_LABEL[p.supportTier] ?? p.supportTier}${p.supportMonths ? ` — ${p.supportMonths} oy` : ""}</div>
      <p style="color:#6b6a70; font-size:14px; margin-top:10px;">
        Loyiha topshirilgandan so‘ng ko‘rsatilgan muddat davomida xatoliklarni bepul tuzatamiz, savollaringizga javob beramiz va tizim ishlashini nazorat qilamiz.
      </p>
    </div>
  </div>`
}

const APX_INK = "#1C2333"
const APX_ACCENT = "#1B3A63"
const APX_MUTED = "#6B7280"
const APX_LINE = "#DADFE7"
const APX_HEAD_BG = "#F3F4F6"
const APX_FONT_LINK = `<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />`

function apxCheckbox(label: string, checked = false): string {
  return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11.5px;">
    <span style="display:inline-block;width:14px;height:14px;flex-shrink:0;border:1.5px solid ${APX_INK};border-radius:2px;${checked ? `background:${APX_ACCENT};border-color:${APX_ACCENT};` : ""}"></span>
    <span>${label}</span>
  </div>`
}

function apxCheckRow(labels: string[], checkedIndex = -1): string {
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 18px;">${labels.map((l, i) => apxCheckbox(l, i === checkedIndex)).join("")}</div>`
}

function apxBullets(items: string[]): string {
  return `<ul style="margin:0;padding-left:16px;">${items.map((i) => `<li style="margin-bottom:4px;">${i}</li>`).join("")}</ul>`
}

function apxTable(headers: string[], rows: string[][]): string {
  return `<table style="width:100%;border-collapse:collapse;font-size:11px;">
    <thead><tr>${headers.map((h) => `<th style="text-align:left;padding:6px 10px;background:${APX_HEAD_BG};text-transform:uppercase;font-size:9px;letter-spacing:0.5px;color:${APX_INK};border:1px solid ${APX_LINE};">${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="padding:6px 10px;border:1px solid ${APX_LINE};vertical-align:top;">${c}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`
}

function apxSection(n: number, title: string, contentHtml: string): string {
  return `<div style="margin-bottom:12px;">
    <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:6px;">
      <span style="color:${APX_ACCENT};font-weight:700;font-size:13px;">${n}.</span>
      <span style="font-weight:700;font-size:13px;">${title}</span>
    </div>
    <div style="border:1px solid ${APX_LINE};border-radius:4px;padding:10px 12px;font-size:11.5px;line-height:1.55;color:${APX_INK};">${contentHtml}</div>
  </div>`
}

function apxField(label: string, value: string | null | undefined): string {
  return `<div style="margin-bottom:6px;">
    <span style="color:${APX_MUTED};font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">${label}</span>
    <div style="font-weight:600;">${value || "......................................"}</div>
  </div>`
}

function apxHeader(companyName: string | null): string {
  return `<div style="display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:12px;border-bottom:2px solid ${APX_ACCENT};margin-bottom:20px;">
    <div>
      <div style="font-size:16px;font-weight:700;">${companyName || "AI Master Azizjon"}</div>
      <div style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:${APX_MUTED};margin-top:2px;">AI integratsiya xizmatlari</div>
    </div>
    <div style="width:40px;height:40px;border-radius:50%;border:1px solid ${APX_LINE};"></div>
  </div>`
}

function apxTitleBlock(n: number, title: string, description: string): string {
  return `<div style="text-align:center;margin-bottom:18px;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${APX_ACCENT};font-weight:700;">ILOVA №${n}</div>
    <h1 style="font-size:21px;font-weight:700;text-transform:uppercase;margin:8px 0 6px;">${title}</h1>
    <div style="font-size:11.5px;color:${APX_MUTED};">${description}</div>
  </div>`
}

function apxMetaRow(city: string | null | undefined, date: string | null | undefined, contractNumber: string | null | undefined): string {
  return `<div style="display:flex;border:1px solid ${APX_LINE};border-radius:4px;margin-bottom:18px;">
    <div style="flex:1;padding:8px 14px;border-right:1px solid ${APX_LINE};">
      <div style="font-size:9px;text-transform:uppercase;color:${APX_MUTED};letter-spacing:1px;">Shahar</div>
      <div style="font-size:13px;font-weight:700;margin-top:2px;">${city || "................"}</div>
    </div>
    <div style="flex:1;padding:8px 14px;border-right:1px solid ${APX_LINE};">
      <div style="font-size:9px;text-transform:uppercase;color:${APX_MUTED};letter-spacing:1px;">Sana</div>
      <div style="font-size:13px;font-weight:700;margin-top:2px;">${date ? formatDate(date) : "“___” __________ 20___ yil"}</div>
    </div>
    <div style="flex:1;padding:8px 14px;">
      <div style="font-size:9px;text-transform:uppercase;color:${APX_MUTED};letter-spacing:1px;">Shartnoma raqami</div>
      <div style="font-size:13px;font-weight:700;margin-top:2px;">№ ${contractNumber || "................"}</div>
    </div>
  </div>`
}

function apxSignatures(companyName: string | null, clientCompanyName: string | null): string {
  return `<div style="display:flex;border:1px solid ${APX_LINE};border-radius:4px;overflow:hidden;margin-top:16px;">
    <div style="flex:1;padding:12px 14px;border-right:1px solid ${APX_LINE};">
      <div style="font-weight:700;font-size:11.5px;color:${APX_ACCENT};margin-bottom:8px;">BAJARUVCHI</div>
      <div style="font-size:10.5px;color:${APX_MUTED};line-height:2;">
        F.I.Sh. / Kompaniya: ${companyName || "AI Master Azizjon"}<br />
        Vakil: ..............................<br />
        Imzo: ..............................<br />
        Muhr: ..............................
      </div>
    </div>
    <div style="flex:1;padding:12px 14px;">
      <div style="font-weight:700;font-size:11.5px;color:${APX_ACCENT};margin-bottom:8px;">BUYURTMACHI</div>
      <div style="font-size:10.5px;color:${APX_MUTED};line-height:2;">
        F.I.Sh. / Kompaniya: ${clientCompanyName || "................"}<br />
        Vakil: ..............................<br />
        Imzo: ..............................<br />
        Muhr: ..............................
      </div>
    </div>
  </div>`
}

function apxFooter(companyName: string | null, docTitle: string): string {
  return `<div style="display:flex;justify-content:space-between;font-size:9px;color:${APX_MUTED};margin-top:16px;padding-top:8px;border-top:1px solid ${APX_LINE};">
    <span>${companyName || "AI Master Azizjon"} | ${docTitle}</span>
    <span>Sahifa 1</span>
  </div>`
}

function apxPage(opts: {
  n: number
  docTitle: string
  description: string
  companyName: string | null
  city?: string | null
  date?: string | null
  contractNumber?: string | null
  bodyHtml: string
  signatures?: boolean
  clientCompanyName?: string | null
}): string {
  return `
  ${APX_FONT_LINK}
  <div style="font-family:'Poppins', system-ui, sans-serif; color:${APX_INK}; background:#fff;">
    <div style="width:210mm; min-height:297mm; margin:0 auto; padding:14mm 16mm 10mm 16mm; background:#fff; box-sizing:border-box; display:flex; flex-direction:column;">
      ${apxHeader(opts.companyName)}
      ${apxTitleBlock(opts.n, opts.docTitle, opts.description)}
      ${apxMetaRow(opts.city, opts.date, opts.contractNumber)}
      <div style="flex:1;">${opts.bodyHtml}</div>
      ${opts.signatures ? apxSignatures(opts.companyName, opts.clientCompanyName ?? null) : ""}
      ${apxFooter(opts.companyName, opts.docTitle)}
    </div>
  </div>`
}

export function renderTzHtml(data: {
  projectName: string
  companyName: string | null
  clientContactName: string | null
  city?: string | null
  contractNumber?: string | null
  date?: string | null
  businessField?: string | null
  mainProduct?: string | null
  contactChannel?: string | null
}): string {
  const body = [
    apxSection(1, "Loyiha haqida umumiy ma’lumot", `
      ${apxField("Loyiha nomi", data.projectName)}
      ${apxField("Buyurtmachi faoliyat sohasi", data.businessField)}
      ${apxField("Asosiy mahsulot / xizmatlar", data.mainProduct)}
      ${apxField("Mas’ul shaxs", data.clientContactName)}
      ${apxField("Aloqa kanali", data.contactChannel)}
    `),
    apxSection(2, "Loyiha maqsadi", apxBullets(["......................................", "......................................", "......................................"])),
    apxSection(3, "Joriy biznes holati", apxTable(["Ko‘rsatkich", "Holat"], [["Joriy jarayon", "......................................"], ["Muammo / ehtiyoj", "......................................"]])),
    apxSection(4, "Yaratiladigan AI tizim turi", apxCheckRow(["AI sotuvchi", "AI konsultant", "AI resepshn", "AI assistent", "AI agent", "AI ovoz tahlil tizimi"])),
    apxSection(5, "AI tizim bajaradigan asosiy vazifalar", `
      ${apxBullets(["......................................", "......................................", "......................................"])}
      <div style="margin-top:6px;">${apxField("Qo‘shimcha", null)}</div>
    `),
    apxSection(6, "AI tizim ishlaydigan kanallar", apxTable(["Kanal", "Faol"], [["Telegram", "☐"], ["Instagram", "☐"], ["WhatsApp", "☐"], ["Sayt", "☐"], ["Facebook", "☐"], ["Boshqa", "☐"]])),
    apxSection(7, "Integratsiya qilinadigan platformalar", apxCheckRow(["AmoCRM", "Bitrix24", "Google Sheets", "Boshqa CRM", "Boshqa"])),
    apxSection(8, "CRM logikasi", `
      ${apxField("Bosqichlar tavsifi", null)}
      ${apxTable(["Bosqich", "Tavsif"], [["1", "......................................"], ["2", "......................................"], ["3", "......................................"]])}
    `),
    apxSection(9, "AI bilim bazasi", apxCheckRow(["PDF", "Excel / Google Sheets", "Web sayt", "Boshqa"])),
    apxSection(10, "AI muloqot uslubi", apxTable(["Uslub", "Tanlangan"], [["Rasmiy", "☐"], ["Norasmiy", "☐"], ["Aralash", "☐"]])),
    apxSection(11, "AI javob bermasligi kerak bo‘lgan holatlar", apxBullets(["......................................", "......................................"])),
    apxSection(12, "Bajariladigan ishlar ro‘yxati", apxTable(["№", "Ish"], [["1", "......................................"], ["2", "......................................"], ["3", "......................................"]])),
    apxSection(13, "Loyihaga kirmaydigan ishlar", apxBullets(["......................................", "......................................"])),
    apxSection(14, "Loyiha muddati va qabul qilish mezonlari", `
      ${apxField("Loyiha muddati", null)}
      ${apxCheckRow(["Qabul qilish mezonlari bajarildi"])}
    `),
  ].join("")

  return apxPage({
    n: 1,
    docTitle: "Texnik topshiriq",
    description: "AI integratsiya xizmatlarini ko‘rsatish shartnomasi ga ilova",
    companyName: data.companyName,
    city: data.city,
    date: data.date,
    contractNumber: data.contractNumber,
    bodyHtml: body,
    signatures: true,
  })
}

export function renderPaymentScheduleHtml(data: {
  projectName: string
  companyName: string | null
  contractNumber?: string | null
  totalAmount: number | null
  paymentStages: { title: string; amount: number; due_date: string | null }[]
}): string {
  const stageRows = data.paymentStages.length
    ? data.paymentStages.map((s) => [s.title, formatMoney(s.amount), s.due_date ? formatDate(s.due_date) : "—"])
    : [["To‘lov bosqichlari kiritilmagan", "—", "—"]]

  const body = [
    apxSection(1, "Umumiy loyiha qiymati", `
      ${apxField("Loyiha umumiy qiymati", data.totalAmount != null ? formatMoney(data.totalAmount) : null)}
      <p style="margin:6px 0 0;color:${APX_MUTED};">Narx AI tizim arxitekturasini ishlab chiqish, prompt va muloqot logikasini tayyorlash, bilim bazasini sozlash, integratsiyalarni ulash, test qilish, ishga tushirish va qisqa yo‘riqnoma berish uchun belgilanadi.</p>
    `),
    apxSection(2, "To‘lov tartibi", apxTable(["Bosqich", "Summa", "Muddat"], stageRows)),
    apxSection(3, "Qo‘shimcha ishlar uchun narx", apxTable(["Qo‘shimcha ish turi", "Narx / hisoblash usuli"], [
      ["Yangi kanal ulash", "......................"],
      ["Yangi CRM integratsiya", "......................"],
      ["Yangi AI ssenariy", "......................"],
      ["Qo‘shimcha til qo‘shish", "......................"],
    ])),
    apxSection(4, "Tashqi xarajatlar", apxBullets([
      "AI model token xarajatlari", "CRM abonent to‘lovi", "hosting va domen", "SMS va telefoniya",
      "WhatsApp / Instagram / Telegram / API xarajatlari", "pullik servislar", "server", "uchinchi tomon plaginlari", "reklama byudjeti",
    ])),
    apxSection(5, "To‘lov kechiksa", "<p style=\"margin:0;\">To‘lov belgilangan muddatda amalga oshirilmasa, Bajaruvchi ishni vaqtincha to‘xtatib turish huquqiga ega. To‘lov kechikkan davr loyiha muddatiga qo‘shilmaydi.</p>"),
    apxSection(6, "To‘lov qaytarilishi", "<p style=\"margin:0;\">Boshlangan bosqich uchun amalga oshirilgan to‘lov qaytarilmaydi. Buyurtmachi loyiha boshlanganidan keyin undan voz kechsa, bajarilgan ish hajmi bo‘yicha to‘lov Bajaruvchida qoladi.</p>"),
  ].join("")

  return apxPage({
    n: 2,
    docTitle: "To‘lov jadvali",
    description: "AI integratsiya xizmatlarini ko‘rsatish shartnomasi ga ilova",
    companyName: data.companyName,
    contractNumber: data.contractNumber,
    bodyHtml: body,
    signatures: true,
  })
}

export function renderSupportActHtml(data: {
  projectName: string
  companyName: string | null
  supportTier: string
  supportMonths: number | null
  price?: number | null
  contractNumber?: string | null
}): string {
  const tierMap: Record<string, number> = { bepul: 3, start: 0, pro: 1, max: 2 }
  const checkedIndex = tierMap[data.supportTier] ?? -1
  const body = [
    apxSection(1, "Qo‘llab-quvvatlash muddati", apxField("Bepul test va texnik tuzatish muddati", data.supportMonths ? `${data.supportMonths} oy` : null)),
    apxSection(2, "Tanlangan paket", apxCheckRow(["Basic", "Standard", "Premium", "Individual"], checkedIndex)),
    apxSection(3, "Paket tafsilotlari", `
      ${apxField("Narxi / oy", data.price != null ? formatMoney(data.price) : null)}
      <div style="margin-top:6px;font-weight:600;">Paketga kiradi:</div>
      ${apxBullets(["texnik tekshiruv va monitoring", "kichik xatolarni tuzatish", "AI javoblarini optimizatsiya qilish", "bilim bazasiga o‘zgartirish kiritish", "Telegram yoki email orqali maslahat"])}
      <div style="margin-top:6px;font-weight:600;">Paketga kirmaydi:</div>
      ${apxBullets(["yangi funksiya / integratsiya / kanal", "CRMni qayta qurish", "katta hajmdagi prompt qayta yozish", "reklama yoki sotuv bo‘yicha ishlar"])}
    `),
    apxSection(4, "Murojaatlarga javob berish vaqti", apxTable(["Paket", "Javob berish muddati"], [
      ["Basic", "24-48 ish soati"], ["Standard", "12-24 ish soati"], ["Premium", "4-12 ish soati"], ["Favqulodda yordam", "Alohida to‘lov asosida"],
    ])),
    apxSection(5, "Texnik qo‘llab-quvvatlashga kirmaydigan holatlar", apxBullets([
      "Buyurtmachi yoki uchinchi shaxs tizimni buzib qo‘ygan bo‘lsa", "login/parol noto‘g‘ri berilgan bo‘lsa",
      "platforma abonent to‘lovi to‘lanmagan yoki token limiti tugagan bo‘lsa", "yangi funksiya yoki boshqa platformaga ko‘chirish kerak bo‘lsa",
    ])),
    apxSection(6, "Qo‘llab-quvvatlashni bekor qilish", "<p style=\"margin:0;\">Har bir Tomon texnik qo‘llab-quvvatlash xizmatini yozma ogohlantirib bekor qilishi mumkin. Oldindan to‘langan oylik to‘lov qaytarilmaydi.</p>"),
  ].join("")

  return apxPage({
    n: 3,
    docTitle: "Texnik qo‘llab-quvvatlash shartlari",
    description: "AI integratsiya xizmatlarini ko‘rsatish shartnomasi ga ilova",
    companyName: data.companyName,
    contractNumber: data.contractNumber,
    bodyHtml: body,
    signatures: true,
  })
}

export function renderAccessActHtml(data: {
  projectName: string
  companyName: string | null
  city?: string | null
  contractNumber?: string | null
  date?: string | null
  accessItems?: { platform: string; login: string; accessType: string; note?: string }[]
}): string {
  const defaultPlatforms = ["AmoCRM", "Bitrix24", "Telegram bot", "Instagram", "Facebook Business", "Sayt admin paneli", "Hosting", "Domen", "Google Sheets", "OpenAI / AI platforma", "Boshqa"]
  const items = data.accessItems?.length ? data.accessItems : defaultPlatforms.map((platform) => ({ platform, login: "", accessType: "", note: "" }))
  const rows = items.map((it, i) => [String(i + 1), it.platform, it.login || "......................", it.accessType || "......................", it.note || "......................"])

  const body = [
    apxSection(1, "Topshirilgan kirish ruxsatlari", apxTable(["№", "Platforma / akkaunt", "Login / identifikator", "Ruxsat turi", "Izoh"], rows)),
    apxSection(2, "API va texnik kalitlar", apxTable(["№", "API / token turi", "Taqdim etilgan sana", "Izoh"], [
      ["1", "OpenAI API", "......................", "......................"],
      ["2", "Telegram Bot Token", "......................", "......................"],
      ["3", "CRM API", "......................", "......................"],
      ["4", "Webhook", "......................", "......................"],
    ])),
    apxSection(3, "Buyurtmachining tasdig‘i", apxBullets([
      "berilgan kirish ruxsatlari loyiha bajarilishi uchun vaqtincha taqdim etilgan",
      "login, parol, API va tokenlarning to‘g‘riligini tekshirgan",
      "uchinchi tomon platformalaridagi to‘lov, limit, bloklash va xavfsizlik uchun o‘zi javobgar",
    ])),
    apxSection(4, "Bajaruvchining majburiyati", apxBullets([
      "kirish ruxsatlaridan faqat loyiha bajarish maqsadida foydalanadi",
      "login, parol, API va tokenlarni uchinchi shaxslarga oshkor qilmaydi",
      "maxfiy ma’lumotlarni himoya qilish choralarini ko‘radi",
    ])),
    apxSection(5, "Muhim ogohlantirish", "<p style=\"margin:0;\">Agar Buyurtmachi noto‘g‘ri login, parol, API, token yoki cheklangan ruxsat bergani sababli loyiha kechiksa, ushbu kechikish uchun Bajaruvchi javobgar bo‘lmaydi.</p>"),
  ].join("")

  return apxPage({
    n: 4,
    docTitle: "Kirish ruxsatlari va akkauntlarni topshirish dalolatnomasi",
    description: "AI integratsiya xizmatlarini ko‘rsatish shartnomasi ga ilova",
    companyName: data.companyName,
    city: data.city,
    date: data.date,
    contractNumber: data.contractNumber,
    bodyHtml: body,
    signatures: true,
  })
}

export function renderAcceptanceActHtml(data: {
  projectName: string
  companyName: string | null
  contractNumber?: string | null
  contractDate?: string | null
  completedItems: string[]
  resultType?: string | null
  totalAmount?: number | null
  paidAmount?: number | null
}): string {
  const fallbackItems = [
    "Brifing va audit", "Texnik topshiriq tayyorlandi", "AI muloqot logikasi yaratildi", "Prompt va ssenariylar sozlandi",
    "Bilim bazasi joylandi", "CRM integratsiya qilindi", "Telegram / Instagram / sayt ulanishi bajarildi",
    "Test ishlari o‘tkazildi", "Aniqlangan texnik xatolar tuzatildi", "Tizim ishga tushirildi", "Buyurtmachiga foydalanish tartibi tushuntirildi",
  ]
  const items = data.completedItems.length ? data.completedItems : fallbackItems
  const rows = items.map((item, i) => [String(i + 1), item, "☐ bajarildi", "......................"])
  const resultOptions = ["AI sotuvchi", "AI konsultant", "AI resepshn", "AI assistent", "AI agent", "AI ovoz tahlil tizimi", "CRM integratsiya", "Telegram bot", "Instagram avtomatlashtirish", "Sayt chat-widget"]
  const resultIndex = data.resultType ? resultOptions.indexOf(data.resultType) : -1
  const remaining = data.totalAmount != null && data.paidAmount != null ? data.totalAmount - data.paidAmount : null

  const body = [
    apxSection(1, "Bajarilgan loyiha", `
      ${apxField("Loyiha nomi", data.projectName)}
      ${apxField("Shartnoma №", data.contractNumber)}
      ${apxField("Shartnoma sanasi", data.contractDate ? formatDate(data.contractDate) : null)}
    `),
    apxSection(2, "Bajarilgan ishlar ro‘yxati", apxTable(["№", "Bajarilgan ish", "Holati", "Izoh"], rows)),
    apxSection(3, "Topshirilgan natija", apxCheckRow(resultOptions, resultIndex)),
    apxSection(4, "Buyurtmachining tasdig‘i", apxCheckRow([
      "bajarilgan ishlarni ko‘rib chiqdi", "tizimni test qildi", "ishlar shartnoma va TZ doirasida qabul qilindi", "e’tiroz yo‘q",
    ])),
    apxSection(5, "Yakuniy hisob-kitob", apxTable(["Ko‘rsatkich", "Summa / muddat"], [
      ["Shartnoma qiymati", data.totalAmount != null ? formatMoney(data.totalAmount) : "......................"],
      ["Oldindan to‘langan summa", data.paidAmount != null ? formatMoney(data.paidAmount) : "......................"],
      ["Qolgan to‘lov", remaining != null ? formatMoney(remaining) : "......................"],
      ["To‘lov muddati", "“___” __________ 20___ yil"],
    ])),
  ].join("")

  return apxPage({
    n: 5,
    docTitle: "Bajarilgan ishlarni qabul qilish dalolatnomasi",
    description: "AI integratsiya xizmatlarini ko‘rsatish shartnomasi ga ilova",
    companyName: data.companyName,
    contractNumber: data.contractNumber,
    bodyHtml: body,
    signatures: true,
  })
}

export function renderNdaHtml(data: {
  projectName: string
  companyName: string | null
  city?: string | null
  contractNumber?: string | null
  date?: string | null
  confidentialityYears?: number | null
}): string {
  const body = [
    apxSection(1, "Kelishuv maqsadi", "<p style=\"margin:0;\">Ushbu Maxfiylik kelishuvi Buyurtmachi va Bajaruvchi o‘rtasida AI integratsiya loyihasi davomida almashiladigan tijorat, texnik, moliyaviy, operatsion, mijozlar bazasi va boshqa maxfiy ma’lumotlarni himoya qilish tartibini belgilaydi.</p>"),
    apxSection(2, "Maxfiy ma’lumotlar tarkibi", apxBullets([
      "mijozlar bazasi, lidlar, telefon raqamlar va aloqa tarixi", "CRM ma’lumotlari, bitimlar va savdo bosqichlari",
      "narxlar, chegirmalar, tijorat takliflari va marja ma’lumotlari", "AI promptlar, bilim bazasi, texnik arxitektura va avtomatlashtirish logikasi",
      "login, parol, API kalitlar, tokenlar va administrator ruxsatlari", "shartnoma qiymati, maxsus kelishuvlar va to‘lov shartlari",
    ])),
    apxSection(3, "Tomonlarning majburiyatlari", `
      <div style="font-weight:600;margin-bottom:2px;">3.1. Bajaruvchi</div>
      ${apxBullets(["maxfiy ma’lumotlardan faqat loyiha bajarish maqsadida foydalanish", "ma’lumotlarni uchinchi shaxslarga oshkor qilmaslik", "login, parol va API kalitlarni ehtiyotkorlik bilan saqlash"])}
      <div style="font-weight:600;margin:8px 0 2px;">3.2. Buyurtmachi</div>
      ${apxBullets(["Bajaruvchining metodologiyasi, promptlari va texnik yechimlarini oshkor qilmaslik", "Bajaruvchi materiallarini ruxsatsiz nusxalamaslik yoki qayta sotmaslik"])}
    `),
    apxSection(4, "Maxfiy hisoblanmaydigan ma’lumotlar", apxBullets([
      "ommaviy manbalarda oldindan mavjud bo‘lgan ma’lumotlar", "mustaqil ishlab chiqilgan ma’lumotlar", "davlat organlari yoki sud talabi bilan oshkor qilinishi majburiy bo‘lgan ma’lumotlar",
    ])),
    apxSection(5, "Amal qilish muddati", `<p style="margin:0;">Ushbu Maxfiylik kelishuvi imzolangan kundan boshlab kuchga kiradi va asosiy shartnoma tugaganidan keyin ham ${data.confidentialityYears ? `${data.confidentialityYears} yil` : "___ yil"} davomida amal qiladi.</p>`),
    apxSection(6, "Javobgarlik", "<p style=\"margin:0;\">Maxfiylik shartlarini buzgan Tomon ikkinchi Tomonga yetkazilgan bevosita, hujjatlar bilan tasdiqlangan zararni O‘zbekiston Respublikasi qonunchiligida belgilangan tartibda qoplaydi.</p>"),
  ].join("")

  return apxPage({
    n: 6,
    docTitle: "Maxfiylik kelishuvi",
    description: "AI integratsiya xizmatlarini ko‘rsatish shartnomasi ga ilova",
    companyName: data.companyName,
    city: data.city,
    date: data.date,
    contractNumber: data.contractNumber,
    bodyHtml: body,
    signatures: true,
  })
}

export function renderChangeRequestHtml(data: {
  projectName: string
  companyName: string | null
  requestedBy?: string | null
  changeDescription?: string | null
  contractNumber?: string | null
  city?: string | null
  date?: string | null
}): string {
  const body = [
    apxSection(1, "Forma maqsadi", "<p style=\"margin:0;\">Ushbu O‘zgarishlar so‘rovi formasi Buyurtmachi tomonidan dastlabki texnik topshiriqdan tashqari yangi funksiya, qo‘shimcha integratsiya, yangi kanal yoki boshqa qo‘shimcha ishlarni rasmiylashtirish uchun qo‘llanadi.</p>"),
    apxSection(2, "So‘rov haqida ma’lumot", apxTable(["Maydon", "Ma’lumot"], [
      ["So‘rov raqami", "№ ......................"],
      ["So‘rov sanasi", "“___” __________ 20___ yil"],
      ["Loyiha nomi", data.projectName],
      ["Shartnoma raqami", data.contractNumber ? `№ ${data.contractNumber}` : "№ ......................"],
      ["So‘rov yuborgan mas’ul shaxs", data.requestedBy || "......................"],
      ["Aloqa kanali", "......................"],
    ])),
    apxSection(3, "So‘ralayotgan o‘zgarish turi", apxCheckRow([
      "Yangi funksiya qo‘shish", "Yangi kanal ulash", "Yangi CRM integratsiya", "AI javoblarini qayta ishlab chiqish",
      "Qo‘shimcha til qo‘shish", "Yangi bilim bazasi", "Qo‘shimcha hisobot", "Muddatni tezlashtirish", "Mavjud logikani o‘zgartirish", "Boshqa",
    ])),
    apxSection(4, "O‘zgarish tavsifi", `
      ${apxField("Buyurtmachi so‘rayotgan o‘zgarish mazmuni", data.changeDescription)}
      ${apxField("Bu o‘zgarish nima uchun kerak", null)}
      ${apxField("Kutilayotgan natija", null)}
    `),
    apxSection(5, "Bajaruvchining texnik bahosi", apxTable(["Baholash maydoni", "Bajaruvchi izohi"], [
      ["Texnik murakkablik", "Past / O‘rta / Yuqori / Juda yuqori"],
      ["Asosiy tizimga ta’siri", "Ta’sir qilmaydi / Qisman / To‘liq qayta ko‘rib chiqish"],
      ["Qo‘shimcha integratsiya kerakmi?", "Ha / Yo‘q"],
      ["Uchinchi tomon xarajati bormi?", "Ha / Yo‘q"],
    ])),
    apxSection(6, "Narx va muddatga ta’siri", apxTable(["Ko‘rsatkich", "Qiymat"], [
      ["Qo‘shimcha ish narxi", "...................... so‘m"],
      ["Qo‘shimcha muddat", "___ ish kuni"],
      ["Ish boshlanish sharti", "To‘lov va yozma tasdiqdan keyin"],
    ])),
    apxSection(7, "Qabul qilish mezonlari", apxBullets(["......................................", "......................................", "......................................"])),
    apxSection(8, "Qaror", apxCheckRow(["So‘rov qabul qilindi", "So‘rov rad etildi", "Qayta ko‘rib chiqish uchun qaytarildi", "Keyingi bosqichga qoldirildi"])),
  ].join("")

  return apxPage({
    n: 7,
    docTitle: "O‘zgarishlar so‘rovi formasi",
    description: "AI integratsiya xizmatlarini ko‘rsatish shartnomasi ga ilova",
    companyName: data.companyName,
    city: data.city,
    date: data.date,
    contractNumber: data.contractNumber,
    bodyHtml: body,
    signatures: true,
  })
}
