import type { Grid, Cell } from './grid.js'
import { createGrid, setCell, clearGrid, clearRegion } from './grid.js'
import { drawBox, drawText, drawTextWrapped } from './draw.js'

export interface Layer {
  grid: Grid
  visible: boolean
  zIndex: number
}

export function createLayer(cols: number, rows: number, zIndex: number = 0): Layer {
  return { grid: createGrid(cols, rows), visible: true, zIndex }
}

export function composeLayers(base: Grid, ...layers: Layer[]): Grid {
  // sort by zIndex — highest on top
  const sorted = [...layers].filter(l => l.visible).sort((a, b) => a.zIndex - b.zIndex)
  
  // start with copy of base
  const result = createGrid(base.cols, base.rows)
  for (let y = 0; y < base.rows; y++) {
    for (let x = 0; x < base.cols; x++) {
      const cell = base.cells[y][x]
      result.cells[y][x] = { ...cell }
    }
  }

  // composite each layer on top
  for (const layer of sorted) {
    for (let y = 0; y < Math.min(layer.grid.rows, result.rows); y++) {
      for (let x = 0; x < Math.min(layer.grid.cols, result.cols); x++) {
        const cell = layer.grid.cells[y][x]
        // transparent cells (char=' ' fg='' bg='') don't overwrite
        if (cell.char !== ' ' || cell.fg !== '#ffffff' || cell.bg !== '') {
          result.cells[y][x] = { ...cell }
        }
      }
    }
  }

  result.dirty = true
  return result
}

export function showLayer(layer: Layer) { layer.visible = true }
export function hideLayer(layer: Layer) { layer.visible = false }
export function toggleLayer(layer: Layer) { layer.visible = !layer.visible }

// helper — draw a modal on a layer
export function drawModal(
  layer: Layer,
  title: string,
  content: string,
  opts?: { fg?: string; borderFg?: string; w?: number; h?: number }
): void {
  const grid = layer.grid
  const w = opts?.w ?? Math.min(40, grid.cols - 4)
  const h = opts?.h ?? Math.min(12, grid.rows - 4)
  const x = Math.floor((grid.cols - w) / 2)
  const y = Math.floor((grid.rows - h) / 2)
  const fg = opts?.fg ?? '#ccc'
  const borderFg = opts?.borderFg ?? '#facc15'

  clearRegion(grid, x, y, w, h)
  drawBox(grid, x, y, w, h, { border: 'double', fg: borderFg, fill: ' ' })
  drawText(grid, x + 2, y, ` ${title} `, { fg: borderFg })
  drawTextWrapped(grid, x + 2, y + 2, w - 4, h - 4, content, { fg })
}
