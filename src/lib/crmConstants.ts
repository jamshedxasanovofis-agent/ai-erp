export const TEMPERATURES = [
  { key: "issiq", label: "Issiq", tone: "danger" as const },
  { key: "iliq", label: "Iliq", tone: "warning" as const },
  { key: "sovuq", label: "Sovuq", tone: "accent" as const },
]

export const SOURCES = [
  { key: "bloger_reklama", label: "Bloger reklama" },
  { key: "eski_mijoz", label: "Eski mijoz" },
  { key: "hamkorlik_referalka", label: "Hamkorlik / Referalka" },
  { key: "oxvat_organika", label: "Oxvat organika" },
  { key: "sarafanka", label: "Sarafanka" },
  { key: "storis", label: "Storis" },
  { key: "target_reklama", label: "Target reklama" },
  { key: "ig", label: "Instagram (target)" },
  { key: "fb", label: "Facebook (target)" },
  { key: "kurs", label: "Kurs" },
  { key: "chatbot", label: "Chat-bot" },
]

export const REGIONS = [
  "Toshkent shahri", "Toshkent viloyati", "Andijon", "Farg'ona", "Namangan", "Sirdaryo",
  "Jizzax", "Samarqand", "Buxoro", "Navoiy", "Qashqadaryo", "Surxondaryo", "Xorazm", "Qoraqalpog'iston",
]

export const BUSINESS_TYPES = [
  { key: "ishlab_chiqarish", label: "Ishlab chiqarish" },
  { key: "talim", label: "Ta'lim" },
  { key: "xizmat", label: "Xizmat" },
  { key: "savdo", label: "Savdo (ulgurji/chakana)" },
]

export const BUSINESS_FIELD_MAP: Record<string, string> = {
  "ishlab_chiqarish": "ishlab_chiqarish",
  "ta'lim": "talim",
  "xizmat_ko'rsatish": "xizmat",
  "savdo_(ulgurji/chakana)": "savdo",
}

export const LANGUAGES = [
  { key: "uzbek", label: "O'zbek" },
  { key: "rus", label: "Rus" },
  { key: "tajik", label: "Tojik" },
  { key: "english", label: "Ingliz" },
]

export const TIERS = ["A", "B", "C"] as const

export const REMINDER_KINDS = [
  { key: "call_back", label: "Qo'ng'iroq qilish" },
  { key: "clarify_answer", label: "Javobni aniqlashtirish" },
  { key: "zoom", label: "Zoom haqida eslatish" },
  { key: "payment", label: "To'lov haqida eslatish" },
  { key: "other", label: "Boshqa" },
]

export const FUNNELS = [
  { value: "marketing" as const, label: "Marketing" },
  { value: "call_center" as const, label: "Call-center" },
]
