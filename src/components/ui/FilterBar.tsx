import { Search } from "lucide-react"
import { Input, Select } from "@/components/ui/Input"
import { cn } from "@/lib/utils"

export type FilterOption = { value: string; label: string }

export type FilterSpec = {
  key: string
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Qidirish...",
  filters,
  className,
}: {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: FilterSpec[]
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {onSearchChange && (
        <div className="relative min-w-0 flex-1 basis-56">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]" />
          <Input
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
          />
        </div>
      )}
      {filters?.map((f) => (
        <Select
          key={f.key}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          className="w-auto min-w-[140px] flex-none"
        >
          <option value="">{f.label}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      ))}
    </div>
  )
}
