# DotArt

> ASCII art library for the web. converts images to ASCII. ships a browser-native ASCII UI engine nobody has built before.

```
⠿⠸⠇⠀⠀⠀⠀⠈⠙⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿
⠿⠿⡆⠀⠀⢀⣤⣶⣿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿
⠿⠿⣿⣦⣀⣴⣿⣿⣿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿
⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿
╔══════════════════════════════╗
║  Neon Drift                  ║
║  Synthwave Collective · 2024 ║
║  ━━━━━━━━━━━━━●──────────── ║
║  ⟨⟨   ▶   ⟩⟩   ⇄   ↻       ║
╚══════════════════════════════╝
```

---

## what is this

dotart is two things:

**1. image → ASCII**

converts any image to high-quality ASCII art using shape-vector matching — the same algorithm behind [asc11.com](https://asc11.com). characters are chosen by shape, not just brightness. edges snap to line-drawing chars. fills match density. the output looks like the source.

**2. ASCII UI engine**

a browser-native grid engine for building interactive UIs entirely out of ASCII characters. boxes, text, images, hover effects, click handlers, animations — all in a character grid that mounts to any DOM element.

nobody has built this for the web. this is that thing.

---

## packages

```
@dotart/ui          browser ASCII grid engine
@dotart/renderer    image → ASCII (Node.js)
@dotart/core        Rust/WASM shape-vector matching engine
```

---

## @dotart/ui

```ts
import {
  createGrid, drawBox, drawText, drawFill, drawImage,
  mountGrid, BORDERS
} from '@dotart/ui'

const grid = createGrid(80, 24)

// draw the UI
drawBox(grid, 0, 0, 80, 24, { border: 'double', fg: '#333' })
drawBox(grid, 2, 2, 30, 20, { border: 'single', fg: '#555', fill: '░' })
drawText(grid, 4, 4, 'Neon Drift', { fg: '#facc15' })
drawText(grid, 4, 5, 'Synthwave Collective', { fg: '#555' })

// mount to DOM
const mounted = mountGrid(grid, document.getElementById('player'))
mounted.update()

// hover effects
mounted.on('hover', 2, 2, 30, 20, () => {
  drawBox(grid, 2, 2, 30, 20, { border: 'heavy', fg: '#facc15' })
  mounted.update()
})

// click handlers
mounted.on('click', 34, 12, 8, 3, () => {
  togglePlay()
  mounted.update()
})

// animation
mounted.loop(30, (dt) => {
  drawWaveform(grid, dt)
  mounted.update()
})
```

### how it works

```
mountGrid(grid, element)
  → wrapper div (position: relative)
      → pre                    ASCII output, renders chars
      → div[data-dotart-overlay]
          → div[data-region]   real DOM element per interactive region
          → div[data-region]   sized/positioned using canvas char measurements
          → div[data-region]   real browser events: click, mouseenter, mouseleave
```

interactive regions are real DOM elements — not coordinate math on every mousemove. devtools-inspectable, CSS-hoverable, touch-friendly.

char dimensions measured via `canvas.measureText()` — same font engine the browser uses to render the `<pre>`. overlay divs align perfectly.

### borders

```ts
BORDERS.single   ╭─╮  │  ╰─╯
BORDERS.double   ╔═╗  ║  ╚═╝
BORDERS.heavy    ┏━┓  ┃  ┗━┛
BORDERS.dashed   ╭╌╮  ╎  ╰╌╯
BORDERS.none     (spaces)
```

### API

```ts
// grid
createGrid(cols, rows) → Grid
setCell(grid, x, y, { char, fg, bg })
getCell(grid, x, y) → Cell | null
clearGrid(grid, fill?)
clearRegion(grid, x, y, w, h, fill?)

// draw
drawBox(grid, x, y, w, h, style?)
drawText(grid, x, y, text, style?)
drawFill(grid, x, y, w, h, char, fg?, bg?)
drawImage(grid, x, y, cells, cols)    ← ASCII image from @dotart/renderer

// mount
mountGrid(grid, element, opts?) → MountedGrid
  .update()                    flush grid to DOM
  .on(type, x,y,w,h, fn)      click | hover | leave → id
  .off(id)
  .loop(fps, fn)               animation loop → LoopHandle
  .destroy()
```

---

## @dotart/renderer

```ts
import { fromFile, CHARSETS } from '@dotart/renderer'

const result = await fromFile('./photo.jpg', {
  cols: 80,
  mode: 'photo',          // braille — best for photos
  globalContrast: 2.0,
  edgeContrast: 1.5,
})

result.toString()   // plain string
result.toHTML()     // span-batched colored HTML
result.cells        // { char, r, g, b }[]

// use with dotart-ui
drawImage(grid, x, y, result.cells, result.cols)
```

charsets:

```ts
CHARSETS.photo   // 256 braille chars — best for photos
CHARSETS.ui      // block + box drawing chars
CHARSETS.block   // ' ░▒▓█' — simple, fast
CHARSETS.mixed   // braille + block
```

---

## @dotart/core

Rust compiled to WASM. the shape-vector matching engine.

based on [Alex Harri's ASCII rendering algorithm](https://alexharri.com/blog/ascii-rendering). each character is sampled at 6 circles in a staggered 2×3 grid → 6D shape vector. image cells are sampled the same way → nearest-neighbor match in 6D space.

```
char bitmaps (6 circles → 6D vector, normalized)
        ↓
image cells (same 6 circles → 6D lookup vector)
        ↓
contrast enhancement (exponent-based, global + directional)
        ↓
euclidean nearest-neighbor → best char
        ↓
avg RGB across cell → color
        ↓
packed Uint8Array [char_index, r, g, b, ...]
```

---

## install

```bash
pnpm install
pnpm build
```

requires: Node >= 18, Rust >= 1.70, wasm-pack >= 0.12, Python + uv (for renderer)

---

## used by

- **fusic** — ASCII music player. album art as braille ASCII, full player UI in the grid.

---

## status

| package | status |
|---|---|
| @dotart/ui | production ready |
| @dotart/renderer | working, quality improving |
| @dotart/core | WASM builds, algorithm correct |

---

## stack

- Rust + wasm-pack → WASM core
- fontdue — pure Rust font rasterizer
- AdwaitaMono — embedded font with braille + block glyph coverage
- sharp — image decode (Node.js)
- mayz/ascii-renderer — Python CLI, MIT licensed
- esbuild — bundle @dotart/ui for browser
- pnpm workspaces + turborepo

---

## license

MIT
