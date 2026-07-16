import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import * as Popover from "@radix-ui/react-popover"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { currentEffectiveTheme, setTheme, type ThemeMode } from "@/lib/theme"
import { Avatar } from "@/components/ui/Avatar"
import { NotificationCenter } from "./NotificationCenter"
import { navItems } from "./navItems"
import { LogOut } from "lucide-react"

function ThemePill() {
  const [mode, setMode] = useState<ThemeMode>("light")

  useEffect(() => {
    setMode(currentEffectiveTheme())
  }, [])

  function choose(next: ThemeMode) {
    setTheme(next)
    setMode(next)
  }

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5">
      {(["light", "dark"] as const).map((m) => (
        <button
          key={m}
          onClick={() => choose(m)}
          className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            mode === m ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[var(--shadow-soft)]" : "text-[var(--color-ink-faint)]"
          }`}
        >
          {m === "light" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  )
}

function AvatarMenu() {
  const { session, signOut } = useAuth()
  const [fullName, setFullName] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setFullName(data?.full_name ?? null))
  }, [session])

  if (!session) return null
  const displayName = fullName ?? session.user.email ?? "Foydalanuvchi"

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="cursor-pointer">
          <Avatar name={displayName} size={32} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          className="z-50 w-56 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]"
        >
          <div className="truncate px-1 text-sm font-medium text-[var(--color-ink)]">{displayName}</div>
          <button
            onClick={signOut}
            className="mt-2 flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
          >
            <LogOut size={14} /> Chiqish
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function Header() {
  const { pathname } = useLocation()
  const pageTitle = navItems.find((i) => i.path === pathname)?.label ?? ""

  return (
    <header className="sticky top-0 z-40 flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 px-6 py-4 backdrop-blur-lg md:px-12">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-1.5 shrink-0 rounded-sm bg-[var(--color-ink)]" />
          <span className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">Dynamic ERP</span>
        </div>
        <div className="h-4 w-px bg-[var(--color-border)]" />
        <span className="font-[family-name:var(--font-display)] whitespace-nowrap text-[13.5px] font-semibold text-[var(--color-ink-soft)]">
          {pageTitle}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <NotificationCenter />
        <AvatarMenu />
        <ThemePill />
      </div>
    </header>
  )
}
