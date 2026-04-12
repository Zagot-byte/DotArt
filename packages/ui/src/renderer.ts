import type { Grid } from './grid.js'
import { prepare } from '@chenglou/pretext'

export function renderToString(grid: Grid): string {
  const rows: string[] = []

  for (let y = 0; y < grid.rows; y++) {
    let html = ''
    let i = 0

    while (i < grid.cols) {
      const cell = grid.cells[y][i]
      const fg = cell.fg
      const bg = cell.bg

      // Batch consecutive cells with same fg+bg
      let j = i + 1
      while (j < grid.cols) {
        const next = grid.cells[y][j]
        if (next.fg !== fg || next.bg !== bg) break
        j++
      }

      let text = ''
      for (let k = i; k < j; k++) {
        text += grid.cells[y][k].char
      }

      // Escape HTML special chars
      text = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      let style = `color:${fg}`
      if (bg) style += `;background:${bg}`

      html += `<span style="${style}">${text}</span>`
      i = j
    }

    rows.push(html)
  }

  grid.dirty = false
  return rows.join('\n')
}

export function measureChar(fontSize: number, fontFamily: string = 'monospace'): { w: number; h: number } {
  // use canvas measureText via pretext — no DOM reflow, exact font engine values
  const font = `${fontSize}px ${fontFamily}`
  const prepared = prepare('A', font)
  
  // canvas measureText for width
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = font
  const metrics = ctx.measureText('A')
  const w = metrics.width
  
  // height from font metrics
  const h = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 2
  
  return { w, h }
}
