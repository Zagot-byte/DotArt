export type HandlerType = 'click' | 'hover' | 'leave'

export interface EventSystem {
  on(type: HandlerType, x: number, y: number, w: number, h: number, fn: () => void): string
  off(id: string): void
  destroy(): void
}

interface Handler {
  id: string
  type: HandlerType
  x: number
  y: number
  w: number
  h: number
  fn: () => void
  inside: boolean  // current state
}

export function createEventSystem(pre: HTMLElement, charW: number, charH: number): EventSystem {
  const handlers = new Map<string, Handler>()
  let nextId = 0

  function getCellCoords(e: MouseEvent) {
    const rect = pre.getBoundingClientRect()
    return {
      cx: Math.floor((e.clientX - rect.left) / charW),
      cy: Math.floor((e.clientY - rect.top) / charH),
    }
  }

  function hitTest(cx: number, cy: number, h: Handler) {
    return cx >= h.x && cx < h.x + h.w && cy >= h.y && cy < h.y + h.h
  }

  function onMouseMove(e: MouseEvent) {
    const { cx, cy } = getCellCoords(e)
    for (const h of handlers.values()) {
      const isInside = hitTest(cx, cy, h)
      if (h.type === 'hover' && isInside && !h.inside) {
        h.inside = true
        h.fn()
      } else if (h.type === 'leave' && !isInside && h.inside) {
        h.inside = false
        h.fn()
      } else if (h.type === 'hover' && !isInside) {
        h.inside = false
      } else if (h.type === 'leave' && isInside) {
        h.inside = true
      }
    }
  }

  function onMouseLeave() {
    for (const h of handlers.values()) {
      if (h.type === 'leave' && h.inside) {
        h.inside = false
        h.fn()
      }
      if (h.type === 'hover') {
        h.inside = false
      }
    }
  }

  function onClick(e: MouseEvent) {
    const { cx, cy } = getCellCoords(e)
    console.log('click fired at cell:', cx, cy)
    console.log('registered handlers:', [...handlers.values()].map(h => `${h.type}(${h.x},${h.y},${h.w},${h.h})`))
    for (const h of handlers.values()) {
      if (h.type === 'click' && hitTest(cx, cy, h)) {
        console.log('hit handler:', h.id)
        h.fn()
      }
    }
  }

  function onTouchEnd(e: TouchEvent) {
    e.preventDefault()
    const touch = e.changedTouches[0]
    const rect = pre.getBoundingClientRect()
    const cx = Math.floor((touch.clientX - rect.left) / charW)
    const cy = Math.floor((touch.clientY - rect.top) / charH)
    console.log('touch at cell:', cx, cy)
    for (const h of handlers.values()) {
      if (h.type === 'click' && hitTest(cx, cy, h)) {
        h.fn()
      }
    }
  }

  pre.addEventListener('mousemove', onMouseMove)
  pre.addEventListener('mouseleave', onMouseLeave)
  pre.addEventListener('click', onClick)
  pre.addEventListener('touchend', onTouchEnd, { passive: false })

  return {
    on(type: HandlerType, x: number, y: number, w: number, h: number, fn: () => void): string {
      const id = `evt-${nextId++}`
      handlers.set(id, { id, type, x, y, w, h, fn, inside: false })
      return id
    },
    off(id: string) {
      handlers.delete(id)
    },
    destroy() {
      pre.removeEventListener('mousemove', onMouseMove)
      pre.removeEventListener('mouseleave', onMouseLeave)
      pre.removeEventListener('click', onClick)
      pre.removeEventListener('touchend', onTouchEnd)
      handlers.clear()
    }
  }
}
