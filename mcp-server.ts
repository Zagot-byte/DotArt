#!/usr/bin/env node
/**
 * dotart MCP server
 * exposes dotart capabilities as tools for AI agents
 * 
 * install: npm install @modelcontextprotocol/sdk
 * run: node mcp-server.js
 * add to claude_desktop_config.json or .cursor/mcp.json
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const server = new Server(
  { name: 'dotart', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

// ── TOOL DEFINITIONS ──────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'dotart_get_api',
      description: 'Get the complete dotart-ui API reference. Call this first before writing any dotart code.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'dotart_get_charsets',
      description: 'Get available charsets for ASCII art rendering',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'dotart_get_borders',
      description: 'Get available border styles for drawBox()',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'dotart_get_patterns',
      description: 'Get common UI patterns and code examples for dotart-ui',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            enum: ['player', 'dashboard', 'list', 'modal', 'input-form', 'animation'],
            description: 'Which pattern to get example code for',
          }
        },
        required: ['pattern'],
      },
    },
    {
      name: 'dotart_validate_code',
      description: 'Validate dotart-ui code for common mistakes before running it',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The dotart code to validate' }
        },
        required: ['code'],
      },
    },
    {
      name: 'dotart_generate_layout',
      description: 'Generate a dotart-ui layout from a description',
      inputSchema: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'What UI to build' },
          cols: { type: 'number', description: 'Grid width in chars', default: 80 },
          rows: { type: 'number', description: 'Grid height in chars', default: 24 },
        },
        required: ['description'],
      },
    },
  ]
}))

// ── TOOL IMPLEMENTATIONS ──────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {

    case 'dotart_get_api':
      return {
        content: [{
          type: 'text',
          text: `# dotart-ui API

## import
\`\`\`ts
import {
  createGrid, setCell, getCell, clearGrid, clearRegion,
  drawBox, drawText, drawFill, drawImage,
  drawTextWrapped, drawScrollable, drawProgress,
  drawSparkline, drawBadge, drawSeparator,
  tweenValue, fadeText, scrollRegion,
  centerText, rightAlign,
  BORDERS, mountGrid,
} from '@dotart/ui'
\`\`\`

## core
- createGrid(cols, rows) → Grid
- setCell(grid, x, y, {char?, fg?, bg?})  — fg/bg are hex '#rrggbb'
- getCell(grid, x, y) → Cell | null
- clearGrid(grid, fill?)
- clearRegion(grid, x, y, w, h, fill?)

## draw
- drawBox(grid, x, y, w, h, {border?, fg?, bg?, fill?})
- drawText(grid, x, y, text, {fg?, bg?, align?, width?})
- drawFill(grid, x, y, w, h, char, fg?, bg?)
- drawImage(grid, x, y, cells, cols) — cells from @dotart/renderer
- drawTextWrapped(grid, x, y, w, h, text, style?) → rowsUsed
- drawScrollable(grid, x, y, w, h, text, offset, style?) → {totalLines, visibleLines}
- drawProgress(grid, x, y, w, value, max, {fg?, filledChar?, emptyChar?, showDot?})
- drawSparkline(grid, x, y, w, values[], {fg?, min?, max?})
- drawBadge(grid, x, y, text, {fg?, bg?}) → width
- drawSeparator(grid, x, y, w, label?, {fg?})
- centerText(grid, y, text, style?)
- rightAlign(grid, y, text, style?)

## animation
- tweenValue(from, to, progress) → number  — ease in-out cubic
- fadeText(grid, x, y, text, style?, onDone?, fps?) → {cancel()}
- scrollRegion(grid, x, y, w, h, dy)  — dy>0 scrolls up

## mount
- mountGrid(grid, element, {fontSize?}) → MountedGrid
  .update()          — flush dirty grid to DOM
  .on(type, x,y,w,h, fn) → id   — type: click|hover|leave
  .off(id)
  .loop(fps, fn(dt)) → {stop()}
  .destroy()

## components & layers
- createScrollable(grid, mounted, x, y, w, h, text, style?) → ScrollableHandle
- createTextInput(grid, mounted, x, y, w, opts?) → TextInputHandle
- createLayer(cols, rows, zIndex?) → Layer
- composeLayers(base, ...layers) → Grid
- showLayer(layer)
- hideLayer(layer)
- toggleLayer(layer)
- drawModal(layer, title, content, opts?)
- createKeyNav(mounted, handlers) → KeyNavHandle

## BORDERS
single, double, heavy, dashed, none

## pretext — text measurement
dotart uses pretext (https://github.com/chenglou/pretext.git) for text measurement.
install: npm install @chenglou/pretext

used by: drawTextWrapped, drawScrollable, textLineCount
never use string.length for width — use pretext for accurate measurement
```ts
import { prepare, layout, prepareWithSegments, layoutWithLines } from '@chenglou/pretext'
const prepared = prepareWithSegments(text, '13px monospace', { whiteSpace: 'pre-wrap' })
const { lines } = layoutWithLines(prepared, widthPx, lineHeightPx)
```

## RULES
1. always clearRegion before redrawing in handlers
2. always call mounted.update() after changes
3. colors must be hex '#rrggbb'
4. drawText clips — use drawTextWrapped for wrapping
5. store loop handles, call .stop() on cleanup`
        }]
      }

    case 'dotart_get_charsets':
      return {
        content: [{
          type: 'text',
          text: `# dotart charsets

photo   = 256 braille chars U+2800-28FF — best for photos, max detail
block   = ' ░▒▓█▀▄▌▐' — simple, high contrast
ui      = ' ░▒▓█▀▄▌▐▁▂▃▅▆▇─━│┃╱╲╳╭╮╯╰┌┐└┘' — UI elements
mixed   = braille + block — general purpose

usage:
\`\`\`ts
const result = await fromFile('./photo.jpg', { mode: 'photo' })
const result = await fromFile('./logo.png', { mode: 'block', globalContrast: 3.0 })
\`\`\``
        }]
      }

    case 'dotart_get_borders':
      return {
        content: [{
          type: 'text',
          text: `# dotart borders

single:  ╭─╮  │  ╰─╯
double:  ╔═╗  ║  ╚═╝
heavy:   ┏━┓  ┃  ┗━┛
dashed:  ╭╌╮  ╎  ╰╌╯
none:    spaces

usage:
\`\`\`ts
drawBox(grid, 0, 0, 40, 10, { border: 'double', fg: '#333' })
drawBox(grid, 2, 2, 36, 6, { border: 'single', fg: '#555', fill: '░' })

// panel with title overlapping border
drawBox(grid, 0, 0, 40, 10, { border: 'single', fg: '#333' })
drawText(grid, 2, 0, ' My Panel ', { fg: '#facc15' })
\`\`\``
        }]
      }

    case 'dotart_get_patterns':
      const patterns: Record<string, string> = {
        player: `# music player pattern
\`\`\`ts
const COLS = 80, ROWS = 20
const grid = createGrid(COLS, ROWS)

// outer shell
drawBox(grid, 0, 0, COLS, ROWS, { border: 'double', fg: '#222' })

// album art panel (left)
drawBox(grid, 1, 1, 20, ROWS-2, { border: 'single', fg: '#333', fill: '░' })
drawText(grid, 2, 0, ' Album Art ', { fg: '#555' })

// track info
drawText(grid, 23, 2, 'Track Title', { fg: '#facc15' })
drawText(grid, 23, 3, 'Artist Name', { fg: '#666' })

// progress
drawProgress(grid, 23, 6, COLS-26, 0.37, 1, { fg: '#facc15', showDot: true })
drawText(grid, 23, 7, '2:14', { fg: '#444' })
rightAlign(grid, 7, '6:02', { fg: '#444' })

// controls
drawText(grid, 30, 9, '⟨⟨  ▶  ⟩⟩  ⇄  ↻', { fg: '#666' })

// waveform animation
let phase = 0
const mounted = mountGrid(grid, el, { fontSize: 13 })
mounted.update()

mounted.loop(30, (dt) => {
  phase += dt * 2
  const chars = '▁▂▃▄▅▆▇█▇▆▅▄▃▂▁'
  for (let i = 0; i < COLS-26; i++) {
    const v = Math.sin(i * 0.3 + phase) * 0.5 + 0.5
    const ci = Math.floor(v * (chars.length-1))
    setCell(grid, 23+i, 11, { char: chars[ci], fg: \`hsl(\${30 + v*20}, 80%, \${30+v*30}%)\` })
  }
  mounted.update()
})
\`\`\``,

        list: `# scrollable list pattern
\`\`\`ts
const items = ['Item 1', 'Item 2', 'Item 3', /* ... */]
let offset = 0
let selected = 0

function render() {
  clearRegion(grid, x, y, w, h)
  for (let i = 0; i < h; i++) {
    const idx = i + offset
    if (idx >= items.length) break
    const isSelected = idx === selected
    clearRegion(grid, x, y+i, w, 1)
    if (isSelected) drawFill(grid, x, y+i, w, 1, ' ', '#fff', '#1a1a1a')
    drawText(grid, x+1, y+i, items[idx], { fg: isSelected ? '#facc15' : '#888' })
  }
  // scrollbar
  const barH = Math.floor(h * h / items.length)
  const barY = Math.floor(offset / items.length * h)
  drawFill(grid, x+w-1, y, 1, h, '│', '#222')
  drawFill(grid, x+w-1, y+barY, 1, barH, '┃', '#444')
  mounted.update()
}

// keyboard nav
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { selected = Math.min(selected+1, items.length-1); if (selected >= offset+h) offset++; render() }
  if (e.key === 'ArrowUp')   { selected = Math.max(selected-1, 0); if (selected < offset) offset--; render() }
})
\`\`\``,

        animation: `# animation patterns
\`\`\`ts
// spinner
const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏']
let f = 0
mounted.loop(12, () => {
  setCell(grid, x, y, { char: frames[f++ % frames.length], fg: '#666' })
  mounted.update()
})

// typewriter
fadeText(grid, 2, 5, 'Hello, world!', { fg: '#fff' }, () => {
  drawText(grid, 2, 6, '— done', { fg: '#444' })
  mounted.update()
})

// smooth progress
let progress = 0
mounted.loop(60, (dt) => {
  progress = Math.min(1, progress + dt * 0.2)
  drawProgress(grid, 2, 10, 40, progress, 1, { fg: '#facc15' })
  if (progress >= 1) drawText(grid, 2, 11, 'complete!', { fg: '#4ade80' })
  mounted.update()
})

// tween panel width
let elapsed = 0
mounted.loop(60, (dt) => {
  elapsed += dt
  const w = Math.floor(tweenValue(10, 40, elapsed / 0.5))
  clearRegion(grid, 0, 0, 50, 10)
  drawBox(grid, 0, 0, w, 10, { border: 'single', fg: '#facc15' })
  mounted.update()
})
\`\`\``,

        dashboard: `# dashboard pattern
\`\`\`ts
const COLS = 100, ROWS = 30
const grid = createGrid(COLS, ROWS)

// header
drawFill(grid, 0, 0, COLS, 2, ' ', '#ccc', '#0d0d0d')
drawText(grid, 2, 0, 'Dashboard', { fg: '#facc15' })
rightAlign(grid, 0, '● Live', { fg: '#4ade80' })
drawFill(grid, 0, 2, COLS, 1, '─', '#1a1a1a')

// stat cards
const stats = [
  { label: 'Users',   value: '12,847', delta: '+4.2%', color: '#4ade80' },
  { label: 'Revenue', value: '$48.2k', delta: '+12.1%', color: '#4ade80' },
  { label: 'Errors',  value: '142',    delta: '-8.3%',  color: '#f87171' },
  { label: 'Uptime',  value: '99.9%',  delta: '0.0%',   color: '#facc15' },
]

stats.forEach((s, i) => {
  const x = 2 + i * 24
  drawBox(grid, x, 4, 22, 6, { border: 'single', fg: '#222' })
  drawText(grid, x+2, 5, s.label, { fg: '#555' })
  drawText(grid, x+2, 6, s.value, { fg: '#fff' })
  drawText(grid, x+2, 7, s.delta, { fg: s.color })
})

// sparklines
const data = Array.from({length: 20}, () => Math.random() * 100)
drawSparkline(grid, 2, 11, COLS-4, data, { fg: '#facc15' })
\`\`\`,

        modal: `# modal pattern
\`\`\`ts
// modal that appears over content
const base = createGrid(80, 24)
const modalLayer = createLayer(80, 24, 10)
let modalVisible = false

// draw base UI
drawBox(base, 0, 0, 80, 24, { border: 'double', fg: '#333' })
drawText(base, 2, 2, 'press M to open modal', { fg: '#555' })

// draw modal content on layer
drawModal(modalLayer, 'Confirm Delete', 
  'This action cannot be undone. Are you sure you want to continue?',
  { borderFg: '#f87171', fg: '#888' }
)
hideLayer(modalLayer)  // hidden by default

const mounted = mountGrid(base, document.getElementById('root'))
mounted.update()

// toggle modal
createKeyNav(mounted, {
  char: (key) => {
    if (key === 'm') {
      modalVisible = !modalVisible
      modalVisible ? showLayer(modalLayer) : hideLayer(modalLayer)
      const composed = composeLayers(base, modalLayer)
      // update pre directly
      mounted.update()
    }
  }
})
\`\`\`,

        'input-form': `# form with text inputs
\`\`\`ts
// form with text inputs
const nameInput = createTextInput(grid, mounted, 10, 5, 30, {
  placeholder: 'Enter name...',
  fg: '#fff',
  onSubmit: (v) => {
    drawText(grid, 10, 7, \`Hello, \${v}!\`, { fg: '#facc15' })
    mounted.update()
  }
})

const searchInput = createTextInput(grid, mounted, 10, 9, 30, {
  placeholder: 'Search...',
  fg: '#fff',
  onChange: (v) => {
    // filter list live
    renderFilteredList(v)
    mounted.update()
  }
})

// click to focus
mounted.on('click', 10, 5, 30, 1, () => nameInput.focus())
mounted.on('click', 10, 9, 30, 1, () => searchInput.focus())
\`\`\`,sed ? '#facc15' : '#444' })
  drawText(grid, x+1, y, display, { fg: '#ccc' })
  drawText(grid, x+w-1, y, ']', { fg: focused ? '#facc15' : '#444' })
  if (focused) setCell(grid, x+1+value.length, y, { char: '▌', fg: '#facc15' })
  mounted.update()
}

mounted.on('click', x, y, w, 1, () => {
  hiddenInput.focus()
  renderInput(x, y, w, inputValue, true)
})

hiddenInput.addEventListener('input', () => {
  inputValue = hiddenInput.value
  renderInput(x, y, w, inputValue, true)
})
\`\`\``,
      }

      return {
        content: [{
          type: 'text',
          text: patterns[args?.pattern as string] ?? 'unknown pattern'
        }]
      }

    case 'dotart_validate_code':
      const code = args?.code as string ?? ''
      const issues: string[] = []

      if (code.includes('mounted.on(') && !code.includes('clearRegion')) {
        issues.push('WARNING: hover/click handlers should call clearRegion() before redrawing to prevent char bleed-through')
      }
      if (code.includes('.on(') && !code.includes('mounted.update()')) {
        issues.push('WARNING: mounted.update() not found in handlers — grid changes won\'t render without it')
      }
      if (code.includes("color:") && !code.includes('#')) {
        issues.push('WARNING: colors must be hex strings like "#facc15" — rgb() not supported')
      }
      if (code.includes('loop(') && !code.includes('.stop()') && !code.includes('destroy')) {
        issues.push('INFO: store loop handle and call .stop() on cleanup to prevent memory leaks')
      }
      if (code.includes('grid.cells[')) {
        issues.push('ERROR: never access grid.cells directly — use setCell() and getCell()')
      }
      if (code.includes('createTextInput') && !code.includes('.destroy()')) {
        issues.push('WARNING: createTextInput creates a hidden DOM <input> — call .destroy() on cleanup to remove it')
      }
      if (code.includes('createKeyNav') && !code.includes('.destroy()')) {
        issues.push('WARNING: createKeyNav attaches to window — call .destroy() to remove listener')
      }
      if (code.includes('createScrollable') && !code.includes('.destroy()')) {
        issues.push('WARNING: createScrollable attaches wheel listener — call .destroy() on cleanup')
      }
      if (code.includes('composeLayers') && !code.includes('mountGrid')) {
        issues.push('INFO: composeLayers returns a new Grid — you need to render it via mountGrid or manual update')
      }

      return {
        content: [{
          type: 'text',
          text: issues.length === 0
            ? '✓ no issues found'
            : issues.join('\n')
        }]
      }

    case 'dotart_generate_layout':
      const desc = (args?.description as string ?? '').toLowerCase()
      const cols = (args?.cols as number) ?? 80
      const rows = (args?.rows as number) ?? 24

      let suggestion = `# layout suggestion for: "${args?.description}"\n\n`
      suggestion += `grid: ${cols}×${rows}\n\n`

      if (desc.includes('player') || desc.includes('music')) {
        suggestion += 'recommended: split layout — left panel 20 cols (album art), right panel (player controls)\n'
        suggestion += 'use: drawBox, drawText, drawProgress (progress bar), drawSparkline (waveform), loop() (animation)\n'
        suggestion += 'pattern: call dotart_get_patterns with pattern="player"'
      } else if (desc.includes('dashboard') || desc.includes('monitor')) {
        suggestion += 'recommended: header bar + stat cards row + chart area\n'
        suggestion += 'use: drawBox (cards), drawSparkline (charts), drawProgress (metrics), drawBadge (status)\n'
        suggestion += 'pattern: call dotart_get_patterns with pattern="dashboard"'
      } else if (desc.includes('list') || desc.includes('issue') || desc.includes('todo')) {
        suggestion += 'recommended: sidebar + scrollable list + detail panel\n'
        suggestion += 'use: drawBox, drawScrollable, drawSeparator, mounted.on("click") per item\n'
        suggestion += 'pattern: call dotart_get_patterns with pattern="list"'
      } else {
        suggestion += 'recommended approach:\n'
        suggestion += '1. drawBox for outer shell\n'
        suggestion += '2. drawBox for inner panels\n'
        suggestion += '3. drawText for content\n'
        suggestion += '4. mounted.on() for interactions\n'
        suggestion += '5. mounted.loop() for animations\n'
        suggestion += '\ncall dotart_get_api for full reference'
      }

      return { content: [{ type: 'text', text: suggestion }] }

    default:
      return { content: [{ type: 'text', text: `unknown tool: ${name}` }] }
  }
})

// ── START ─────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport()
await server.connect(transport)
console.error('dotart MCP server running')
