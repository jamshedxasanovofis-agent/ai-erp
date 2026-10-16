import { useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import { ChevronDown, Check } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { Checkbox } from "@/components/ui/Checkbox"

type ProfileOption = { id: string; full_name: string; avatar_url?: string | null }

export function MultiAssigneeSelect({
  value, onChange, profiles, placeholder = "Tanlanmagan",
}: {
  value: string[]
  onChange: (ids: string[]) => void
  profiles: ProfileOption[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = profiles.filter((p) => value.includes(p.id))

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-left text-sm transition-colors hover:bg-[var(--color-surface-2)]"
        >
          {selected.length === 0 ? (
            <span className="text-[var(--color-ink-faint)]">{placeholder}</span>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
              <div className="flex -space-x-1.5">
                {selected.slice(0, 4).map((p) => (
                  <Avatar key={p.id} name={p.full_name} src={p.avatar_url} size={22} className="ring-2 ring-[var(--color-surface)]" />
                ))}
              </div>
              <span className="truncate text-xs text-[var(--color-ink-soft)]">
                {selected.length === 1 ? selected[0].full_name : `${selected.length} kishi`}
              </span>
            </div>
          )}
          <ChevronDown size={14} className="shrink-0 text-[var(--color-ink-faint)]" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[110] w-64 max-w-[90vw] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-card)]"
        >
          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            {profiles.map((p) => {
              const checked = value.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm hover:bg-[var(--color-surface-2)]"
                >
                  <span onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={checked} onCheckedChange={() => toggle(p.id)} />
                  </span>
                  <Avatar name={p.full_name} src={p.avatar_url} size={20} />
                  <span className="min-w-0 flex-1 truncate">{p.full_name}</span>
                  {checked && <Check size={13} className="shrink-0 text-[var(--color-accent)]" />}
                </button>
              )
            })}
            {profiles.length === 0 && <p className="px-2 py-3 text-center text-xs text-[var(--color-ink-faint)]">Xodimlar yo'q</p>}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
