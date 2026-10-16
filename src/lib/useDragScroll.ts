import { useRef } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"

// Click-and-drag horizontal panning for wide Kanban-style boards, like a
// mouse-driven version of touch swipe (touch already scrolls natively —
// this only kicks in for e.pointerType === "mouse" so phones/tablets are
// untouched and dnd-kit's own touch handling on cards isn't affected).
// Only starts panning when the pointer goes down outside an actual
// draggable card (data-dnd-card) — cards keep working with dnd-kit as before.
//
// Move/up listeners are attached to `document`, not via React's synthetic
// pointer props on the container — without this, the browser's native
// text-selection drag gesture can win the race and silently swallow the
// move events (cursor still shows "grabbing" from the CSS :active state,
// but nothing actually scrolls).
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)

  function onPointerDown(e: ReactPointerEvent<T>) {
    if (e.pointerType !== "mouse" || e.button !== 0) return
    if ((e.target as HTMLElement).closest("[data-dnd-card]")) return
    const el = ref.current
    if (!el) return

    e.preventDefault() // stop native text/image drag-selection from stealing the gesture
    const startX = e.clientX
    const startScrollLeft = el.scrollLeft
    let moved = false

    function onMove(ev: PointerEvent) {
      moved = true
      el!.scrollLeft = startScrollLeft - (ev.clientX - startX)
    }
    function onUp() {
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerup", onUp)
      document.removeEventListener("pointercancel", onUp)
      if (moved) document.body.style.userSelect = ""
    }

    document.body.style.userSelect = "none" // belt-and-braces against text selection mid-drag
    document.addEventListener("pointermove", onMove)
    document.addEventListener("pointerup", onUp)
    document.addEventListener("pointercancel", onUp)
  }

  return {
    ref,
    dragScrollProps: { onPointerDown },
  }
}

// Append to the container's className alongside dragScrollProps.
export const DRAG_SCROLL_CLASS = "cursor-grab active:cursor-grabbing"
