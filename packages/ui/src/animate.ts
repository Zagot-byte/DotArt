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
