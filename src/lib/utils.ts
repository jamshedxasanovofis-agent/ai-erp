import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(n: number, currency = "UZS") {
  return new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(n) + " " + currency
}

export function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d
  return new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date)
}

export function formatDateTime(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d
  return new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date)
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")
}
