import { useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { navItems } from "./navItems"
import { useAuth } from "@/lib/auth"

export function BottomDock() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { role } = useAuth()

  const visibleItems = useMemo(
    () => (role === "full" ? navItems : navItems.filter((i) => i.path === "/sotuv")),
    [role]
  )

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[18px]">
      <nav
        className="nav-scroll pointer-events-auto flex max-w-[92vw] items-center gap-0.5 overflow-x-auto rounded-full border border-white/[0.06] p-[7px] shadow-[var(--shadow-dock)]"
        style={{ background: "linear-gradient(180deg,#1d1c22,#0f0e13)", scrollbarWidth: "none" }}
      >
        {visibleItems.map((item) => {
          const Icon = item.icon
          const active = item.path === pathname
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex shrink-0 cursor-pointer flex-col items-center gap-1 rounded-[14px] px-3 py-2 transition-colors duration-150 ${
                active ? "bg-white/[0.14] text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              <Icon size={15} strokeWidth={1.7} />
              <span className="font-[family-name:var(--font-display)] whitespace-nowrap text-[9.5px] font-medium leading-none">
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
