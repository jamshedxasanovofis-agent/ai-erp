import type { InputHTMLAttributes } from "react"
import { Input } from "./Input"
import { formatUzPhone, formatThousands } from "@/lib/utils"

// Displays the O'zbek-formatted phone ("+998 90 123 45 67" / "90 123 45 67")
// while typing or showing an already-stored value; the parent always gets
// the raw digits (with a leading + preserved if present) via onChange, so
// storage/DB values stay simple.
export function PhoneInput({ value, onChange, ...props }: {
  value: string
  onChange: (v: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <Input
      {...props}
      inputMode="tel"
      value={formatUzPhone(value)}
      onChange={(e) => {
        const kept = e.target.value.replace(/[^\d+]/g, "")
        onChange(kept)
      }}
    />
  )
}

// Displays a sum with thousands-grouping spaces ("6 250 000") while typing
// or showing an already-stored value; the parent always gets the raw digit
// string via onChange (easy to Number()/store).
export function AmountInput({ value, onChange, ...props }: {
  value: string
  onChange: (v: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <Input
      {...props}
      inputMode="numeric"
      value={formatThousands(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "")
        onChange(digits)
      }}
    />
  )
}
