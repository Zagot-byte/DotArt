import type { Grid, TextStyle } from './grid.js'
import { setCell, getCell, clearRegion } from './grid.js'
import { prepare, layout, prepareWithSegments, layoutWithLines } from '@chenglou/pretext'

export let CHAR_W = 8
export let CHAR_H = 13
export function setCharDimensions(w: number, h: number) { CHAR_W = w; CHAR_H = h }

export const BORDERS = {
  single:  { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
  double:  { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  heavy:   { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
  dashed:  { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '╌', v: '╎' },
  none:    { tl: ' ', tr: ' ', bl: ' ', br: ' ', h: ' ', v: ' ' },
}

type BorderSet = { tl: string; tr: string; bl: string; br: string; h: string; v: string }

export interface BoxStyle {
  border?: keyof typeof BORDERS | BorderSet
  fg?: string
  bg?: string
  fill?: string
}

// Note: TextStyle is now imported from grid.ts for consistency

export function drawBox(grid: Grid, x: number, y: number, w: number, h: number, style?: BoxStyle): void {
  const fg = style?.fg ?? '#ffffff'
  const bg = style?.bg ?? ''
  const fillChar = style?.fill ?? ' '

  let border: BorderSet
  if (!style?.border || style.border === 'single') {
    border = BORDERS.single
  } else if (typeof style.border === 'string') {
    border = BORDERS[style.border as keyof typeof BORDERS]
  } else {
    border = style.border as BorderSet
  }

  // Fill interior
  if (w > 2 && h > 2) {
    clearRegion(grid, x + 1, y + 1, w - 2, h - 2, { char: fillChar, fg, bg })
  }

  // Corners
  setCell(grid, x,         y,         { char: border.tl, fg, bg })
  setCell(grid, x + w - 1, y,         { char: border.tr, fg, bg })
  setCell(grid, x,         y + h - 1, { char: border.bl, fg, bg })
  setCell(grid, x + w - 1, y + h - 1, { char: border.br, fg, bg })

  // Horizontal edges
  for (let col = x + 1; col < x + w - 1; col++) {
    setCell(grid, col, y,         { char: border.h, fg, bg })
    setCell(grid, col, y + h - 1, { char: border.h, fg, bg })
  }

  // Vertical edges
  for (let row = y + 1; row < y + h - 1; row++) {
    setCell(grid, x,         row, { char: border.v, fg, bg })
    setCell(grid, x + w - 1, row, { char: border.v, fg, bg })
  }
}

export function drawText(grid: Grid, x: number, y: number, text: string, style?: TextStyle): void {
  const fg = style?.fg ?? '#ffffff'
  const bg = style?.bg ?? ''
  const width = style?.width
  const align = style?.align ?? 'left'

  let str = text
  if (width !== undefined) {
    if (str.length > width) {
      str = str.slice(0, width)
    } else if (str.length < width) {
      const pad = width - str.length
      if (align === 'center') {
        const left = Math.floor(pad / 2)
        const right = pad - left
        str = ' '.repeat(left) + str + ' '.repeat(right)
      } else if (align === 'right') {
        str = ' '.repeat(pad) + str
      } else {
        str = str + ' '.repeat(pad)
      }
    }
  }

  for (let i = 0; i < str.length; i++) {
    setCell(grid, x + i, y, { char: str[i], fg, bg })
  }
}

export function drawFill(grid: Grid, x: number, y: number, w: number, h: number, char: string, fg?: string, bg?: string): void {
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      setCell(grid, col, row, { char, fg: fg ?? '#ffffff', bg: bg ?? '' })
    }
  }
}

export function drawImage(
  grid: Grid,
  x: number,
  y: number,
  cells: { char: string; r: number; g: number; b: number }[],
  cols: number
): void {
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    const cx = x + (i % cols)
    const cy = y + Math.floor(i / cols)
    const fg = '#' +
      cell.r.toString(16).padStart(2, '0') +
      cell.g.toString(16).padStart(2, '0') +
      cell.b.toString(16).padStart(2, '0')
    setCell(grid, cx, cy, { char: cell.char, fg })
  }
}

export function drawTextWrapped(
  grid: Grid, x: number, y: number, w: number, h: number,
  text: string, style?: TextStyle
): number {
  const prepared = prepareWithSegments(text, `${CHAR_H}px monospace`, { whiteSpace: 'pre-wrap' })
  const { lines } = layoutWithLines(prepared, w * CHAR_W, CHAR_H)
  const count = Math.min(lines.length, h)
  for (let i = 0; i < count; i++) {
    drawText(grid, x, y + i, lines[i].text, style)
  }
  return count
}

export function drawScrollable(
  grid: Grid, x: number, y: number, w: number, h: number,
  text: string, scrollOffset: number, style?: TextStyle
): { totalLines: number; visibleLines: number } {
  const prepared = prepareWithSegments(text, `${CHAR_H}px monospace`, { whiteSpace: 'pre-wrap' })
  const { lines } = layoutWithLines(prepared, w * CHAR_W, CHAR_H)
  clearRegion(grid, x, y, w, h)
  const visible = lines.slice(scrollOffset, scrollOffset + h)
  for (let i = 0; i < visible.length; i++) {
    drawText(grid, x, y + i, visible[i].text, style)
  }
  return { totalLines: lines.length, visibleLines: visible.length }
}

export function textLineCount(text: string, w: number): number {
  const prepared = prepare(text, `${CHAR_H}px monospace`)
  const { lineCount } = layout(prepared, w * CHAR_W, CHAR_H)
  return lineCount
}

export function drawProgress(
  grid: Grid, x: number, y: number, w: number,
  value: number, max: number,
  style?: { fg?: string; filledChar?: string; emptyChar?: string; showDot?: boolean }
): void {
  const fg = style?.fg ?? '#ffffff'
  const filled = style?.filledChar ?? '━'
  const empty = style?.emptyChar ?? '─'
  const showDot = style?.showDot ?? true
  const ratio = Math.max(0, Math.min(1, max > 0 ? value / max : 0))
  const filledW = Math.floor(ratio * w)
  for (let i = 0; i < w; i++) {
    if (showDot && i === filledW) {
      setCell(grid, x + i, y, { char: '●', fg })
    } else if (i < filledW) {
      setCell(grid, x + i, y, { char: filled, fg })
    } else {
      setCell(grid, x + i, y, { char: empty, fg: '#2a2a2a' })
    }
  }
}

export function drawSparkline(
  grid: Grid, x: number, y: number, w: number,
  values: number[],
  style?: { fg?: string; min?: number; max?: number }
): void {
  if (values.length === 0) return
  const fg = style?.fg ?? '#ffffff'
  const min = style?.min ?? Math.min(...values)
  const max = style?.max ?? Math.max(...values)
  const range = max - min || 1
  const bars = ' ▂▃▄▅▆▇█'
  const step = values.length / w
  for (let i = 0; i < w; i++) {
    const idx = Math.floor(i * step)
    const v = values[Math.min(idx, values.length - 1)]
    const norm = (v - min) / range
    const ci = Math.floor(norm * (bars.length - 1))
    setCell(grid, x + i, y, { char: bars[ci], fg })
  }
}

export function drawBadge(
  grid: Grid, x: number, y: number, text: string,
  style?: { fg?: string; bg?: string }
): number {
  const fg = style?.fg ?? '#ffffff'
  const bg = style?.bg ?? ''
  const content = ` ${text} `
  for (let i = 0; i < content.length; i++) {
    setCell(grid, x + i, y, { char: content[i], fg, bg })
  }
  return content.length
}

export function drawSeparator(
  grid: Grid, x: number, y: number, w: number,
  label?: string,
  style?: { fg?: string }
): void {
  const fg = style?.fg ?? '#333333'
  if (!label) {
    for (let i = 0; i < w; i++) setCell(grid, x + i, y, { char: '─', fg })
    return
  }
  const padded = ` ${label} `
  const sideW = Math.floor((w - padded.length) / 2)
  for (let i = 0; i < sideW; i++) setCell(grid, x + i, y, { char: '─', fg })
  for (let i = 0; i < padded.length; i++) {
    setCell(grid, x + sideW + i, y, { char: padded[i], fg })
  }
  const rightStart = sideW + padded.length
  for (let i = rightStart; i < w; i++) setCell(grid, x + i, y, { char: '─', fg })
}

export function centerText(grid: Grid, y: number, text: string, style?: TextStyle): void {
  const x = Math.floor((grid.cols - text.length) / 2)
  drawText(grid, x, y, text, style)
}

export function rightAlign(grid: Grid, y: number, text: string, style?: TextStyle): void {
  const x = grid.cols - text.length - 1
  drawText(grid, x, y, text, style)
}

export function tweenValue(from: number, to: number, progress: number): number {
  const t = Math.max(0, Math.min(1, progress))
  // ease in-out cubic
  const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  return from + (to - from) * ease
}

export function scrollRegion(
  grid: Grid, x: number, y: number, w: number, h: number, dy: number
): void {
  if (dy === 0) return
  if (dy > 0) {
    // scroll up — shift rows up
    for (let row = y; row < y + h - dy; row++) {
      for (let col = x; col < x + w; col++) {
        const src = getCell(grid, col, row + dy)
        if (src) setCell(grid, col, row, { ...src })
      }
    }
    // clear bottom rows
    clearRegion(grid, x, y + h - dy, w, dy)
  } else {
    // scroll down — shift rows down
    const absDy = Math.abs(dy)
    for (let row = y + h - 1; row >= y + absDy; row--) {
      for (let col = x; col < x + w; col++) {
        const src = getCell(grid, col, row - absDy)
        if (src) setCell(grid, col, row, { ...src })
      }
    }
    clearRegion(grid, x, y, w, absDy)
  }
}
