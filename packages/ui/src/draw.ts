import type { Grid } from './grid.js'
import { setCell, clearRegion } from './grid.js'

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

export interface TextStyle {
  fg?: string
  bg?: string
  align?: 'left' | 'center' | 'right'
  width?: number
}

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
