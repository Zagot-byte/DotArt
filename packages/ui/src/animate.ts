import type { Grid } from './grid.js'
import { setCell } from './grid.js'

export interface LoopHandle {
  stop(): void
}

export function createLoop(fps: number, fn: (dt: number) => void): LoopHandle {
  const interval = 1000 / fps
  let lastTime = -1
  let rafId = 0
  let running = true

  function tick(now: number): void {
    if (!running) return
    rafId = requestAnimationFrame(tick)

    if (lastTime < 0) {
      lastTime = now
      return
    }

    const elapsed = now - lastTime
    if (elapsed >= interval) {
      const dt = elapsed / 1000
      lastTime = now - (elapsed % interval)
      fn(dt)
    }
  }

  rafId = requestAnimationFrame(tick)

  return {
    stop() {
      running = false
      cancelAnimationFrame(rafId)
    },
  }
}

export interface TypewriterHandle { cancel(): void }

export function fadeText(
  grid: Grid,
  x: number, y: number,
  text: string,
  style?: { fg?: string; bg?: string },
  onDone?: () => void,
  fps: number = 24
): TypewriterHandle {
  let cancelled = false
  let i = 0
  const interval = 1000 / fps
  let last = performance.now()

  function tick(now: number) {
    if (cancelled) return
    if (now - last >= interval) {
      last = now
      if (i < text.length) {
        setCell(grid, x + i, y, { char: text[i], fg: style?.fg ?? '#ffffff', bg: style?.bg ?? '' })
        i++
        grid.dirty = true
      } else {
        onDone?.()
        return
      }
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  return { cancel() { cancelled = true } }
}
