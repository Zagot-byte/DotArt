export * from './grid.js'
export * from './draw.js'
export * from './renderer.js'
export * from './events.js'
export * from './animate.js'

import type { Grid } from './grid.js'
import { renderToString } from './renderer.js'
import { createLoop } from './animate.js'
import type { LoopHandle } from './animate.js'

export interface MountedGrid {
  update(): void
  on(type: 'click' | 'hover' | 'leave', x: number, y: number, w: number, h: number, fn: () => void): string
  off(id: string): void
  loop(fps: number, fn: (dt: number) => void): LoopHandle
  destroy(): void
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
  const charW = metrics.width
  const charH = fontSize  // line-height: 1.0 = fontSize px per row

  // wrapper — position relative so overlay can use absolute
  const wrapper = document.createElement('div')
  wrapper.style.position = 'relative'
  wrapper.style.display = 'inline-block'
  wrapper.style.lineHeight = '0'

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
  overlay.setAttribute('data-dotart-overlay', '')

  wrapper.appendChild(pre)
  wrapper.appendChild(overlay)
  element.appendChild(wrapper)

  // track previous grid state for diffing
  let prevHTML = ''
  const loops: LoopHandle[] = []
  const regions = new Map<string, HTMLElement>()
  let nextId = 0

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
      } else if (type === 'hover') {
        div.addEventListener('mouseenter', fn)
      } else if (type === 'leave') {
        div.addEventListener('mouseleave', fn)
      }

      overlay.appendChild(div)
      regions.set(id, div)
      return id
    },

    off(id: string) {
      const div = regions.get(id)
      if (div) { overlay.removeChild(div); regions.delete(id) }
    },

    loop(fps: number, fn: (dt: number) => void): LoopHandle {
      const handle = createLoop(fps, fn)
      loops.push(handle)
      return handle
    },

    destroy() {
      for (const l of loops) l.stop()
      regions.clear()
      element.removeChild(wrapper)
    }
  }
}
