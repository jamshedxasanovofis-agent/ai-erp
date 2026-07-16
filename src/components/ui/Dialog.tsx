import * as RDialog from "@radix-ui/react-dialog"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RDialog.Portal forceMount>
            <RDialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </RDialog.Overlay>
            <RDialog.Content asChild forceMount>
              <motion.div
                className={cn(
                  "fixed left-1/2 top-1/2 z-[101] flex max-h-[85vh] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]",
                  className
                )}
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 6 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] p-6 pb-4">
                  {title && <RDialog.Title className="text-base font-semibold">{title}</RDialog.Title>}
                  <RDialog.Close className="rounded-full p-1.5 text-[var(--color-ink-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)] cursor-pointer">
                    <X size={16} />
                  </RDialog.Close>
                </div>
                <div className="overflow-y-auto p-6 pt-4">{children}</div>
              </motion.div>
            </RDialog.Content>
          </RDialog.Portal>
        )}
      </AnimatePresence>
    </RDialog.Root>
  )
}
