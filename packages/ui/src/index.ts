export * from './grid.js'
export * from './draw.js'
export * from './renderer.js'
export * from './events.js'
export * from './animate.js'
export * from './input.js'
export * from './layers.js'

import type { Grid, TextStyle } from './grid.js'
import { setCell, clearRegion } from './grid.js'
import { renderToString } from './renderer.js'
import { createLoop } from './animate.js'
import { setCharDimensions, CHAR_W, CHAR_H, drawText } from './draw.js'
import type { LoopHandle } from './animate.js'
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext'

export interface MountedGrid {
  update(): void
  on(type: 'click' | 'hover' | 'leave', x: number, y: number, w: number, h: number, fn: () => void): string
  off(id: string): void
  loop(fps: number, fn: (dt: number) => void): LoopHandle
  destroy(): void
  /** @internal — used by createScrollable; do not rely on in userland */ _element: HTMLElement
  /** @internal — used by createScrollable; do not rely on in userland */ _pre: HTMLElement
  /** @internal — used by createScrollable; do not rely on in userland */ _wrapper: HTMLElement
}

interface Region {
  div: HTMLElement
  x: number
  y: number
  w: number
  h: number
}

export function mountGrid(grid: Grid, element: HTMLElement, opts?: { fontSize?: number }): MountedGrid {
  const fontSize = opts?.fontSize ?? 13
  const font = `${fontSize}px monospace`

  // measure exact char dimensions using pretext + canvas
  // canvas.measureText uses same font engine as browser rendering
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = font
  const metrics = ctx.measureText('A')
  let charW = metrics.width
  let charH = fontSize  // line-height: 1.0 = fontSize px per row
  setCharDimensions(charW, charH)

  // wrapper — position relative so overlay can use absolute
  const wrapper = document.createElement('div')
  wrapper.style.position = 'relative'
  wrapper.style.display = 'inline-block'
  wrapper.style.lineHeight = '0'
  wrapper.style.touchAction = 'manipulation'  // prevents double-tap zoom

  // ASCII layer
  const pre = document.createElement('pre')
  pre.style.fontFamily = 'monospace'
  pre.style.fontSize = `${fontSize}px`
  pre.style.lineHeight = '1.0'
  pre.style.whiteSpace = 'pre'
  pre.style.letterSpacing = '0'
  pre.style.margin = '0'
  pre.style.padding = '0'
  pre.style.cursor = 'default'
  pre.style.userSelect = 'none'

  // overlay layer — sits on top of pre, captures interactions
  const overlay = document.createElement('div')
  overlay.style.position = 'absolute'
  overlay.style.top = '0'
  overlay.style.left = '0'
  overlay.style.width = '100%'
  overlay.style.height = '100%'
  overlay.style.pointerEvents = 'none'  // default passthrough
  overlay.style.touchAction = 'manipulation'
  overlay.setAttribute('data-dotart-overlay', '')

  wrapper.appendChild(pre)
  wrapper.appendChild(overlay)
  element.appendChild(wrapper)

  // track previous grid state for diffing
  let prevHTML = ''
  const loops: LoopHandle[] = []
  const regions = new Map<string, Region>()
  let nextId = 0

  function remeasure() {
    const rctx = document.createElement('canvas').getContext('2d')!
    rctx.font = font
    const newCharW = rctx.measureText('A').width
    const newCharH = fontSize

    if (Math.abs(newCharW - charW) > 0.1) {
      // font rendering changed (zoom, display scaling, or font finally loaded)
      charW = newCharW
      charH = newCharH
      setCharDimensions(charW, charH)

      // reposition all existing overlay divs with updated dimensions
      for (const r of regions.values()) {
        r.div.style.left = `${r.x * charW}px`
        r.div.style.top = `${r.y * charH}px`
        r.div.style.width = `${r.w * charW}px`
        r.div.style.height = `${r.h * charH}px`
      }
    }
  }

  // watch for size changes — covers zoom, window resize, display scaling
  const resizeObserver = new ResizeObserver(() => remeasure())
  resizeObserver.observe(pre)

  // catch late font loads: if monospace wasn't loaded at mount time,
  // charW was measured from a fallback font — this corrects it
  document.fonts.ready.then(() => remeasure())

  return {
    update() {
      if (!grid.dirty) return
      const html = renderToString(grid)
      if (html !== prevHTML) {
        pre.innerHTML = html
        prevHTML = html
      }
    },

    on(type: 'click' | 'hover' | 'leave', x: number, y: number, w: number, h: number, fn: () => void): string {
      const id = `region-${nextId++}`

      // create real DOM element positioned over the grid region
      const div = document.createElement('div')
      div.style.position = 'absolute'
      div.style.left = `${x * charW}px`
      div.style.top = `${y * charH}px`
      div.style.width = `${w * charW}px`
      div.style.height = `${h * charH}px`
      div.style.pointerEvents = 'auto'  // capture events
      div.style.cursor = type === 'click' ? 'pointer' : 'default'
      div.setAttribute('data-region', id)
      div.setAttribute('data-type', type)

      if (type === 'click') {
        div.addEventListener('click', fn)
        // touch tap
        div.addEventListener('touchend', (e) => {
          e.preventDefault()  // prevent ghost click
          fn()
        })
      } else if (type === 'hover') {
        div.addEventListener('mouseenter', fn)
        // touch start = hover
        div.addEventListener('touchstart', (e) => {
          e.preventDefault()
          fn()
        }, { passive: false })
      } else if (type === 'leave') {
        div.addEventListener('mouseleave', fn)
        // touch end = leave
        div.addEventListener('touchend', (e) => {
          e.preventDefault()
          fn()
        })
        div.addEventListener('touchcancel', fn)
      }

      overlay.appendChild(div)
      regions.set(id, { div, x, y, w, h })
      return id
    },

    off(id: string) {
      const reg = regions.get(id)
      if (reg) {
        overlay.removeChild(reg.div)
        regions.delete(id)
      }
    },

    loop(fps: number, fn: (dt: number) => void): LoopHandle {
      const handle = createLoop(fps, fn)
      loops.push(handle)
      return handle
    },

    destroy() {
      for (const l of loops) l.stop()
      resizeObserver.disconnect()
      regions.clear()
      element.removeChild(wrapper)
    },

    _element: element,
    _pre: pre,
    _wrapper: wrapper,
  }
}

// ── createScrollable ────────────────────────────────────────────────────────

export interface ScrollableHandle {
  scrollUp(): void
  scrollDown(): void
  scrollTo(offset: number): void
  getOffset(): number
  getTotalLines(): number
  destroy(): void
}

/**
 * Wraps a grid region with built-in wheel scroll support.
 * Uses pretext for accurate line wrapping — never string.length.
 *
 * @example
 * const scroll = createScrollable(grid, mounted, 2, 2, 40, 20, longText, { fg: '#ccc' })
 * // user can now wheel-scroll inside the region
 * // scroll.scrollTo(n) / scrollUp() / scrollDown() also work programmatically
 * // call scroll.destroy() on cleanup
 */
export function createScrollable(
  grid: Grid,
  mounted: MountedGrid,
  x: number, y: number, w: number, h: number,
  text: string,
  style?: TextStyle,
): ScrollableHandle {
  let offset = 0

  // use pretext for pixel-accurate line splitting — never string.length
  const font = `${CHAR_H}px monospace`
  const prepared = prepareWithSegments(text, font, { whiteSpace: 'pre-wrap' })
  const { lines } = layoutWithLines(prepared, w * CHAR_W, CHAR_H)
  const totalLines = lines.length
  const maxOffset = Math.max(0, totalLines - h)

  function render() {
    clearRegion(grid, x, y, w, h)
    const visible = lines.slice(offset, offset + h)
    for (let i = 0; i < visible.length; i++) {
      drawText(grid, x, y + i, visible[i].text, style)
    }
    // scrollbar on right edge — only when content overflows
    if (totalLines > h) {
      const barH = Math.max(1, Math.floor(h * h / totalLines))
      const barY = maxOffset > 0
        ? Math.floor(offset / maxOffset * (h - barH))
        : 0
      for (let i = 0; i < h; i++) {
        const inBar = i >= barY && i < barY + barH
        setCell(grid, x + w - 1, y + i, {
          char: inBar ? '┃' : '│',
          fg:   inBar ? '#555555' : '#1a1a1a',
        })
      }
    }
    mounted.update()
  }

  render()

  // wheel handler — attached to the pre element so it fires anywhere over the grid
  function onWheel(e: WheelEvent) {
    e.preventDefault()
    if (e.deltaY > 0) {
      offset = Math.min(offset + 1, maxOffset)
    } else {
      offset = Math.max(offset - 1, 0)
    }
    render()
  }

  // attach to the pre element — wheel events bubble up from the ASCII layer
  mounted._pre.addEventListener('wheel', onWheel, { passive: false })

  return {
    scrollUp()  { offset = Math.max(0, offset - 1);          render() },
    scrollDown(){ offset = Math.min(maxOffset, offset + 1);   render() },
    scrollTo(o: number) {
      offset = Math.max(0, Math.min(maxOffset, o))
      render()
    },
    getOffset()     { return offset },
    getTotalLines() { return totalLines },
    destroy() {
      mounted._pre.removeEventListener('wheel', onWheel)
    },
  }
}

// ── createKeyNav ────────────────────────────────────────────────────────

export interface KeyNavHandle {
  destroy(): void
}

export function createKeyNav(
  mounted: MountedGrid,
  handlers: {
    up?: () => void
    down?: () => void
    left?: () => void
    right?: () => void
    enter?: () => void
    escape?: () => void
    tab?: () => void
    char?: (key: string) => void
  }
): KeyNavHandle {
  function onKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); handlers.up?.(); break
      case 'ArrowDown':  e.preventDefault(); handlers.down?.(); break
      case 'ArrowLeft':  e.preventDefault(); handlers.left?.(); break
      case 'ArrowRight': e.preventDefault(); handlers.right?.(); break
      case 'Enter':      e.preventDefault(); handlers.enter?.(); break
      case 'Escape':     e.preventDefault(); handlers.escape?.(); break
      case 'Tab':        e.preventDefault(); handlers.tab?.(); break
      default:
        if (e.key.length === 1) handlers.char?.(e.key)
    }
  }

  window.addEventListener('keydown', onKeyDown)

  return {
    destroy() { window.removeEventListener('keydown', onKeyDown) }
  }
}
