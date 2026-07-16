import type { ReactNode } from "react"
import { Header } from "./Header"
import { BottomDock } from "./BottomDock"

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col">
      <Header />
      <main id="app-scroll" className="flex-1 overflow-y-auto px-6 pb-56 pt-8 md:px-10">
        <div className="mx-auto max-w-[1800px]">{children}</div>
      </main>
      <BottomDock />
    </div>
  )
}
