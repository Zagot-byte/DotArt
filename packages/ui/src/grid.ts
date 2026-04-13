export interface Cell {
  char: string
  fg: string   // hex color e.g. '#ffffff'
  bg: string   // hex color or '' for transparent
}

export interface Grid {
  cols: number
  rows: number
  cells: Cell[][]
  dirty: boolean
}

export interface TextStyle {
  fg?: string
  bg?: string
  align?: 'left' | 'center' | 'right'
  width?: number
}

const DEFAULT_CELL: Cell = { char: ' ', fg: '#ffffff', bg: '' }

export function createGrid(cols: number, rows: number): Grid {
  const cells: Cell[][] = []
  for (let y = 0; y < rows; y++) {
    const row: Cell[] = []
    for (let x = 0; x < cols; x++) {
      row.push({ ...DEFAULT_CELL })
    }
    cells.push(row)
  }
  return { cols, rows, cells, dirty: true }
}

export function setCell(grid: Grid, x: number, y: number, cell: Partial<Cell>): void {
  if (x < 0 || x >= grid.cols || y < 0 || y >= grid.rows) return
  const existing = grid.cells[y][x]
  if (cell.char !== undefined) existing.char = cell.char
  if (cell.fg !== undefined) existing.fg = cell.fg
  if (cell.bg !== undefined) existing.bg = cell.bg
  grid.dirty = true
}

export function getCell(grid: Grid, x: number, y: number): Cell | null {
  if (x < 0 || x >= grid.cols || y < 0 || y >= grid.rows) return null
  return grid.cells[y][x]
}

export function clearGrid(grid: Grid, fill?: Partial<Cell>): void {
  const char = fill?.char ?? ' '
  const fg = fill?.fg ?? '#ffffff'
  const bg = fill?.bg ?? ''
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      grid.cells[y][x] = { char, fg, bg }
    }
  }
  grid.dirty = true
}

export function clearRegion(grid: Grid, x: number, y: number, w: number, h: number, fill?: Partial<Cell>): void {
  const char = fill?.char ?? ' '
  const fg = fill?.fg ?? '#ffffff'
  const bg = fill?.bg ?? ''
  for (let row = y; row < y + h && row < grid.rows; row++) {
    for (let col = x; col < x + w && col < grid.cols; col++) {
      if (col >= 0 && row >= 0) {
        grid.cells[row][col] = { char, fg, bg }
      }
    }
  }
  grid.dirty = true
}
