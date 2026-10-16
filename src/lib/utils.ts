import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(n: number, currency = "UZS") {
  return new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(n) + " " + currency
}

// Live-formats a sum as the user types (or as it's shown read-only):
// "6250000" -> "6 250 000". Strips everything but digits first, so it's
// safe to call on a value that's already partially formatted.
export function formatThousands(raw: string | number): string {
  const digits = String(raw ?? "").replace(/\D/g, "")
  if (!digits) return ""
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
}

// Un-formats back to a plain digit string, for storing/parsing as a number.
export function unformatThousands(formatted: string): string {
  return formatted.replace(/\D/g, "")
}

// O'zbekiston raqam formati: agar +998/998 bilan bo'lsa "+998 90 123 45 67",
// aks holda (mahalliy 9 xonali raqam) "90 123 45 67". Kiritilgan qiymatda
// allaqachon bo'shliqlar/tire bo'lsa ham to'g'ri qayta formatlaydi.
export function formatUzPhone(raw: string): string {
  const trimmed = (raw ?? "").trim()
  if (!trimmed) return trimmed
  const digits = trimmed.replace(/\D/g, "")

  let local: string
  let hasCountryCode: boolean
  if (digits.startsWith("998")) {
    hasCountryCode = true
    local = digits.slice(3)
  } else {
    hasCountryCode = false
    local = digits
  }

  // Not a recognizable 9-digit Uzbek local number — return best-effort
  // original rather than mangling something else (a landline, a foreign
  // number pasted in, etc).
  if (local.length !== 9) return raw

  const grouped = `${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`
  return hasCountryCode ? `+998 ${grouped}` : grouped
}

// Har doim Toshkent vaqti bo'yicha ko'rsatiladi (server UTC'da ishlaydi,
// tomoshabin brauzeri esa boshqa mintaqada bo'lishi mumkin — shuning uchun
// timeZone aniq belgilanadi, aks holda har xil odam har xil vaqt ko'radi).
const TASHKENT_TZ = "Asia/Tashkent"

export function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d
  return new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TASHKENT_TZ }).format(date)
}

export function formatDateTime(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d
  return new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TASHKENT_TZ }).format(date)
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")
}
