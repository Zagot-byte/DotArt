# CONTEXT — DotArt

ASCII art library. two things: image→ASCII and ASCII UI grid engine.

## repo location
~/DotArt/

## structure
```
packages/
  core/          Rust → WASM. shape-vector matching engine.
  renderer/      TypeScript. fromFile() via mayz Python CLI.
  ui/            Browser ASCII grid engine. THE MAIN THING.

example/
  ui-bundle.js          built bundle of packages/ui
  test-interactions.html  interaction test page
  demo.html               music player demo
  dark.jpg / test.jpg     test images

build-ui.mjs     esbuild script → outputs example/ui-bundle.js
```

## packages/ui — STATUS: WORKING

the main deliverable. browser-native ASCII grid.

### architecture (NEW — dual layer)
```
mountGrid(grid, element)
  → wrapper div (position:relative)
      → pre         ASCII output layer (dumb, just chars)
      → div[data-dotart-overlay]   interaction layer (real DOM elements)
          → div[data-region="..."]  one per on() call, absolutely positioned
```

char dimensions measured via canvas.measureText() — same font engine browser uses.
pretext (@chenglou/pretext) installed for accurate measurement.

charW = ctx.measureText('A').width
charH = fontSize  (line-height:1.0 means row height = fontSize px exactly)

overlay divs positioned: left = x*charW, top = y*charH, width = w*charW, height = h*charH
interactions: real DOM events (click, mouseenter, mouseleave) on overlay divs
devtools friendly: each region visible as data-region div in inspector

### API
```ts
createGrid(cols, rows) → Grid
setCell(grid, x, y, cell)
getCell(grid, x, y)
clearGrid(grid, fill?)
clearRegion(grid, x, y, w, h, fill?)

BORDERS = { single, double, heavy, dashed, none }

drawBox(grid, x, y, w, h, style?)
drawText(grid, x, y, text, style?)
drawFill(grid, x, y, w, h, char, fg?, bg?)
drawImage(grid, x, y, cells, cols)

mountGrid(grid, element, opts?) → MountedGrid
  .update()                     flush dirty grid to DOM
  .on(type, x, y, w, h, fn)    register click/hover/leave handler → id
  .off(id)                      remove handler
  .loop(fps, fn)                animation loop → LoopHandle
  .destroy()                    cleanup

createLoop(fps, fn) → LoopHandle

// New Components
createScrollable(grid, mounted, x, y, w, h, text, style?) → ScrollableHandle
createTextInput(grid, mounted, x, y, w, opts?) → TextInputHandle
createKeyNav(mounted, handlers) → KeyNavHandle

// Layers
createLayer(cols, rows, zIndex) → Layer
showLayer(layer)
hideLayer(layer)
toggleLayer(layer)
composeLayers(base, ...layers) → Grid
drawModal(layer, title, content, opts?)
```

### interaction status
- click ✓ working (real DOM click event)
- hover ✓ working (real DOM mouseenter)
- leave ✓ working (real DOM mouseleave)
- animation ✓ working (RAF gated by fps)
- devtools ✓ regions visible in inspector

### build
```bash
cd ~/DotArt && node build-ui.mjs
# outputs example/ui-bundle.js
```

### test
```bash
cd ~/DotArt/example && python3 -m http.server 3000
# open http://localhost:3000/test-interactions.html
```

## packages/renderer — STATUS: WORKING (quality needs work)

```ts
import { fromFile, CHARSETS } from '@dotart/renderer/src/index.ts'
const r = await fromFile('./photo.jpg', {
  cols: 80,
  mode: 'block',        // 'block' | 'photo' | 'mixed'
  globalContrast: 2.0,
  edgeContrast: 1.5,
})
r.toString()   // plain string
r.toHTML()     // span-batched colored HTML
r.cells        // {char, r, g, b}[]
```

uses mayz/ascii-renderer Python CLI at ~/mayz via uv.
depends on Python + uv being installed.
image quality: decent for block chars, braille needs font work.

## packages/core — STATUS: WASM BUILDS, QUALITY NOT ASC11

Rust WASM shape-vector matching.
font: AdwaitaMono at packages/core/assets/font.ttf
▀ and ▄ have identical vectors (font issue, minor)
build: cd packages/core && wasm-pack build --target nodejs
debug: wasm.debug_shapes(charset) → shape vectors per char

## key decisions

- dual-layer DOM architecture for interactions (pre + overlay)
- canvas.measureText for char dimensions (not getBoundingClientRect)
- pretext installed but canvas.measureText used directly (same result, no dep needed)
- no fromComponent, no Playwright, no snapdom
- WASM loaded via require() not import() (CJS)
- color = avg of entire cell not center pixel
- fusic is separate repo ~/fusic, uses dotart as dependency

## next: fusic

music player app. uses packages/ui.
layout: left panel album art (drawImage), right panel player chrome (drawBox/drawText)
animated waveform via loop()
album art via fromFile() → drawImage()

## session rules

- paste this CONTEXT.md at start of every Claude Code session
- rebuild after every ui change: cd ~/DotArt && node build-ui.mjs
- test: http://localhost:3000/test-interactions.html
- one task per session
- /compact every 10 messages
