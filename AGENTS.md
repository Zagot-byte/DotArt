# AGENTS.md — dotart

This file is written for AI agents (Claude, Cursor, Copilot, etc.) to understand dotart and use it correctly without hallucinating.

## what dotart is

dotart is a browser-native ASCII UI library. two packages:

- `@dotart/ui` — render interactive ASCII UIs in any DOM element
- `@dotart/renderer` — convert images to ASCII cells (Node.js)

## @dotart/ui — complete API

### setup

```ts
import {
  createGrid, setCell, getCell, clearGrid, clearRegion,
  drawBox, drawText, drawFill, drawImage,
  drawTextWrapped, drawScrollable, drawProgress,
  drawSparkline, drawBadge, drawSeparator,
  tweenValue, fadeText, scrollRegion,
  centerText, rightAlign,
  BORDERS,
  mountGrid,
} from '@dotart/ui'

const grid = createGrid(80, 24)   // cols, rows
const mounted = mountGrid(grid, document.getElementById('root'), { fontSize: 13 })
mounted.update()  // flush to DOM
```

### grid primitives

```ts
createGrid(cols: number, rows: number): Grid

setCell(grid, x, y, { char?, fg?, bg? })
// x=0 is leftmost col, y=0 is top row
// fg/bg are hex strings '#rrggbb' or '' for transparent
// out of bounds = silent skip

getCell(grid, x, y): Cell | null

clearGrid(grid, fill?: { char?, fg?, bg? })
// resets all cells to default

clearRegion(grid, x, y, w, h, fill?)
// resets rectangular region
```

### draw primitives

```ts
// box with border
drawBox(grid, x, y, w, h, {
  border?: 'single'|'double'|'heavy'|'dashed'|'none',  // default 'single'
  fg?: string,     // border color
  bg?: string,     // background color
  fill?: string,   // fill char, default ' '
})

// BORDERS presets
BORDERS.single   // ╭─╮ │ ╰─╯
BORDERS.double   // ╔═╗ ║ ╚═╝
BORDERS.heavy    // ┏━┓ ┃ ┗━┛
BORDERS.dashed   // ╭╌╮ ╎ ╰╌╯
BORDERS.none     // spaces

// text at position (single line, clips at grid edge)
drawText(grid, x, y, text, {
  fg?: string,
  bg?: string,
  align?: 'left'|'center'|'right',
  width?: number,   // required for center/right align
})

// flood fill region
drawFill(grid, x, y, w, h, char, fg?, bg?)

// paste ASCII image cells from @dotart/renderer
drawImage(grid, x, y, cells: {char,r,g,b}[], cols: number)
```

## pretext — text measurement

dotart-ui uses **pretext** (https://github.com/chenglou/pretext.git) for all text measurement.

pretext is a pure JS/TS library by chenglou. measures text WITHOUT touching the DOM.
no getBoundingClientRect, no offsetHeight, no layout reflow.
uses canvas.measureText() — same font engine browser uses to render.

install: `npm install @chenglou/pretext`

why dotart uses it:
- drawTextWrapped — exact chars per line at pixel width
- drawScrollable — accurate line splitting
- textLineCount — check fit before drawing
- mountGrid — exact charW from font engine not DOM

pretext API used in dotart:
```ts
import { prepare, layout, prepareWithSegments, layoutWithLines } from '@chenglou/pretext'

// how many lines does text take
const prepared = prepare(text, '13px monospace')
const { lineCount } = layout(prepared, widthPx, lineHeightPx)

// split into lines for rendering
const prepared = prepareWithSegments(text, '13px monospace', { whiteSpace: 'pre-wrap' })
const { lines } = layoutWithLines(prepared, widthPx, lineHeightPx)
// lines[i].text = string for that line
```

RULE: never use string.length for width. unicode/emoji/box-drawing chars have variable widths. always use pretext.

### text layout (via pretext)

```ts
// auto-wrap text within a box — uses pretext for accurate measurement
drawTextWrapped(grid, x, y, w, h, text, style?): number
// returns number of rows used
// clips at h rows

// scrollable text region
drawScrollable(grid, x, y, w, h, text, scrollOffset, style?)
// returns { totalLines, visibleLines }
// call with scrollOffset=0 initially, increment on scroll

// how many lines does text take at width w
textLineCount(text, w): number
```

### ui components

```ts
// progress bar
drawProgress(grid, x, y, w, value, max, {
  fg?: string,
  filledChar?: string,   // default '━'
  emptyChar?: string,    // default '─'
  showDot?: boolean,     // show ● at progress point
})

// mini braille sparkline from data array
drawSparkline(grid, x, y, w, values: number[], {
  fg?: string,
  min?: number,   // auto if not provided
  max?: number,
})

// badge/pill
drawBadge(grid, x, y, text, { fg?, bg? })
// renders [ text ] with 1 char padding each side

// section separator
drawSeparator(grid, x, y, w, label?, { fg? })
// renders ──── label ──── or just ──────

// center text horizontally in grid
centerText(grid, y, text, style?)

// right align text
rightAlign(grid, y, text, style?)
```

### advanced components & layers

```ts
// scroll
createScrollable(grid, mounted, x, y, w, h, text, style?) → ScrollableHandle
  .scrollUp()
  .scrollDown()
  .scrollTo(offset)
  .getOffset()
  .getTotalLines()
  .destroy()

// text input
createTextInput(grid, mounted, x, y, w, opts?) → TextInputHandle
  opts: { fg?, bg?, cursorChar?, placeholder?, onChange?, onSubmit? }
  .focus()
  .blur()
  .getValue()
  .setValue(v)
  .destroy()

// layers
createLayer(cols, rows, zIndex?) → Layer
composeLayers(base, ...layers) → Grid
showLayer(layer)
hideLayer(layer)
toggleLayer(layer)
drawModal(layer, title, content, opts?) → void

// keyboard navigation
createKeyNav(mounted, handlers) → KeyNavHandle
  handlers: { up?, down?, left?, right?, enter?, escape?, tab?, char? }
  .destroy()
```

### animation

```ts
// smooth value interpolation — call in loop
tweenValue(from, to, progress): number
// progress = 0..1
// example: tweenValue(0, 1, elapsed/duration)

// type text char by char
fadeText(grid, x, y, text, style?, onDone?: () => void)
// returns handle with .cancel()

// shift content up/down within region
scrollRegion(grid, x, y, w, h, dy)
// dy=1 shifts content up by 1 row (scroll down)
// dy=-1 shifts content down by 1 row (scroll up)

// flash a cell briefly
flashCell(grid, x, y, duration, style, originalStyle)
```

### mount and interactions

```ts
const mounted = mountGrid(grid, element, { fontSize?: number })

mounted.update()   // flush dirty grid to DOM. checks grid.dirty first.

// register interactive region
// returns id string for cleanup
mounted.on('click',  x, y, w, h, () => {})
mounted.on('hover',  x, y, w, h, () => {})
mounted.on('leave',  x, y, w, h, () => {})
mounted.off(id)

// animation loop
mounted.loop(fps, (dt: number) => {})   // dt = seconds since last frame
// returns LoopHandle with .stop()

mounted.destroy()  // cleanup everything
```

### architecture (important)

```
mountGrid creates two DOM layers:
  <div style="position:relative">
    <pre>                     ASCII output (text only, no events)
    <div data-dotart-overlay> interaction layer
      <div data-region="..."> one real DOM element per on() call
                              sized/positioned using canvas.measureText
                              real browser events: click/mouseenter/mouseleave
```

char dimensions: `canvas.measureText('A').width` for width, `fontSize` for height (line-height:1.0).
overlay divs repositioned automatically on ResizeObserver.
touch events: touchstart=hover, touchend=click+leave.

### common patterns

**panel with title:**
```ts
drawBox(grid, x, y, w, h, { border: 'single', fg: '#333' })
drawText(grid, x+2, y, ' Title ', { fg: '#facc15' })  // overlaps top border
```

**active/inactive toggle:**
```ts
function renderButton(active: boolean) {
  clearRegion(grid, x, y, w, h)
  drawBox(grid, x, y, w, h, { border: active ? 'heavy' : 'single', fg: active ? '#facc15' : '#444' })
  drawText(grid, x+2, y+1, label, { fg: active ? '#facc15' : '#888' })
}
mounted.on('click', x, y, w, h, () => { active = !active; renderButton(active); mounted.update() })
mounted.on('hover', x, y, w, h, () => { /* highlight */ mounted.update() })
mounted.on('leave', x, y, w, h, () => { /* restore  */ mounted.update() })
```

**animated progress:**
```ts
let progress = 0
mounted.loop(30, (dt) => {
  progress = Math.min(1, progress + dt * 0.1)
  drawProgress(grid, 2, 10, 40, progress, 1, { fg: '#facc15' })
  mounted.update()
})
```

**typewriter effect:**
```ts
fadeText(grid, 2, 5, 'Hello, world!', { fg: '#fff' }, () => {
  drawText(grid, 2, 6, 'done typing', { fg: '#444' })
  mounted.update()
})
```

**scrollable list:**
```ts
let offset = 0
const content = items.join('\n')

function render() {
  const { totalLines } = drawScrollable(grid, 2, 2, 40, 20, content, offset, { fg: '#ccc' })
  drawProgress(grid, 43, 2, 1, offset, totalLines - 20, { fg: '#333' })  // scrollbar
  mounted.update()
}

mounted.on('click', 2, 2, 40, 20, () => { offset = Math.min(offset+1, totalLines-20); render() })
```

**scrollable region with wheel support:**
```ts
const scroller = createScrollable(grid, mounted, 2, 5, 40, 15, longText, { fg: '#888' })
// mouse wheel auto-handled
// manual scroll:
scroller.scrollDown()
scroller.scrollUp()
```

**text input with cursor:**
```ts
const input = createTextInput(grid, mounted, 2, 10, 30, {
  placeholder: 'search...',
  fg: '#fff',
  onChange: (v) => { /* live update */ },
  onSubmit: (v) => { /* enter pressed */ }
})
input.focus()  // call to activate
```

**modal on layer above base grid:**
```ts
const modal = createLayer(grid.cols, grid.rows, 10)
drawModal(modal, 'Confirm', 'Are you sure?', { borderFg: '#facc15' })
showLayer(modal)
// to render: composeLayers(grid, modal) → pass to mounted
mounted.on('click', confirmX, confirmY, 10, 3, () => {
  hideLayer(modal)
  mounted.update()
})
```

**keyboard navigation:**
```ts
const nav = createKeyNav(mounted, {
  up:     () => { selected--; render() },
  down:   () => { selected++; render() },
  enter:  () => { openSelected(); render() },
  escape: () => { closeModal(); render() },
})
// always call nav.destroy() on cleanup
```

## @dotart/renderer — API

```ts
import { fromFile, CHARSETS } from '@dotart/renderer'

// Node.js only — requires Python + uv + mayz at ~/mayz
const result = await fromFile(path, {
  cols?: number,           // default 80
  mode?: 'photo'|'ui'|'block'|'mixed',
  charset?: string,        // overrides mode
  globalContrast?: number, // default 2.0
  edgeContrast?: number,   // default 1.5
})

result.toString()          // plain string
result.toHTML()            // span-batched colored HTML, no <pre> wrapper
result.cells               // {char: string, r: number, g: number, b: number}[]
result.cols                // number
result.rows                // number

// use cells with dotart-ui:
drawImage(grid, x, y, result.cells, result.cols)

// charsets
CHARSETS.photo   // 256 braille — best for photos
CHARSETS.block   // ' ░▒▓█' — simple
CHARSETS.ui      // block + box drawing chars
CHARSETS.mixed   // braille + block
```

## hard rules for agents

1. always `clearRegion` before redrawing a region in a hover/click handler — otherwise old chars bleed through
2. always call `mounted.update()` after changing the grid — nothing renders without it
3. `mounted.update()` is a no-op if `grid.dirty === false` — safe to call every frame
4. `on()` returns an id — store it if you need to remove the handler with `off(id)`
5. `loop()` returns a handle — call `.stop()` on cleanup or in `mounted.destroy()`
6. coords: x=col (0=left), y=row (0=top), w=width in cols, h=height in rows
7. colors: always hex strings '#rrggbb' — rgb() strings not supported
8. `drawText` clips at grid edge — no wrapping. use `drawTextWrapped` for wrapping
9. `drawImage` clips silently — safe to call even if cells extend beyond grid
10. never manipulate `grid.cells` directly — always use setCell/clearRegion
11. createTextInput needs a hidden <input> in document.body — always call .destroy() on cleanup
12. composeLayers returns a NEW grid — pass it to a separate mountGrid or render manually
13. createKeyNav attaches to window — always call .destroy() to avoid memory leaks
14. createScrollable attaches wheel listener — always call .destroy() on cleanup
15. layers are composited top-to-bottom by zIndex — higher zIndex = on top
16. transparent cells in layers (char=' ' fg='#ffffff' bg='') = passthrough, don't overwrite base

## repo structure

```
~/DotArt/
  packages/
    core/       Rust WASM — shape-vector matching
    renderer/   TypeScript — fromFile()
    ui/         TypeScript — grid engine (THE MAIN THING)
  example/
    ui-bundle.js          built bundle, import this in HTML
    test-interactions.html
    stress-test.html
    linear-dotart.html
    ascii-demo.html
  build-ui.mjs            run: node build-ui.mjs → rebuilds ui-bundle.js
  CONTEXT.md              project context
  AGENTS.md               this file
```

## rebuild after changes

```bash
cd ~/DotArt && node build-ui.mjs
cd ~/DotArt/example && python3 -m http.server 3000
# open http://localhost:3000/your-file.html
```
