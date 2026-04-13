import { setCell, clearRegion } from './grid.js'
import type { Grid } from './grid.js'
import type { MountedGrid } from './index.js'

export interface TextInputHandle {
  focus(): void
  blur(): void
  getValue(): string
  setValue(v: string): void
  destroy(): void
}

export function createTextInput(
  grid: Grid,
  mounted: MountedGrid,
  x: number, y: number, w: number,
  opts?: {
    fg?: string
    bg?: string
    cursorChar?: string
    placeholder?: string
    onChange?: (value: string) => void
    onSubmit?: (value: string) => void
  }
): TextInputHandle {
  const fg = opts?.fg ?? '#ffffff'
  const bg = opts?.bg ?? ''
  const cursorChar = opts?.cursorChar ?? '▌'
  const placeholder = opts?.placeholder ?? ''

  let value = ''
  let focused = false
  let cursorPos = 0
  let blinkOn = true
  let blinkInterval: ReturnType<typeof setInterval> | null = null

  // hidden real input — exists only to capture keyboard events + IME
  const input = document.createElement('input')
  input.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;top:0;left:0'
  input.setAttribute('autocomplete', 'off')
  input.setAttribute('autocorrect', 'off')
  input.setAttribute('autocapitalize', 'off')
  input.setAttribute('spellcheck', 'false')
  document.body.appendChild(input)

  function render() {
    clearRegion(grid, x, y, w, 1)

    if (!focused && value === '' && placeholder) {
      // placeholder state
      const text = placeholder.slice(0, w - 2)
      setCell(grid, x, y, { char: '[', fg: '#333', bg })
      for (let i = 0; i < w - 2; i++) {
        setCell(grid, x + 1 + i, y, { char: text[i] ?? ' ', fg: '#333', bg })
      }
      setCell(grid, x + w - 1, y, { char: ']', fg: '#333', bg })
      mounted.update()
      return
    }

    // border brackets
    setCell(grid, x, y, { char: '[', fg: focused ? fg : '#555', bg })
    setCell(grid, x + w - 1, y, { char: ']', fg: focused ? fg : '#555', bg })

    // text content — scroll window so cursor stays visible
    const innerW = w - 2
    const start = Math.max(0, cursorPos - innerW + 1)
    const visible = value.slice(start, start + innerW)

    for (let i = 0; i < innerW; i++) {
      const ch = visible[i] ?? ' '
      const isCursor = focused && blinkOn && (start + i === cursorPos)
      setCell(grid, x + 1 + i, y, {
        char: isCursor ? cursorChar : ch,
        fg: isCursor ? '#facc15' : fg,
        bg,
      })
    }

    mounted.update()
  }

  function startBlink() {
    blinkInterval = setInterval(() => {
      blinkOn = !blinkOn
      render()
    }, 500)
  }

  function stopBlink() {
    if (blinkInterval) { clearInterval(blinkInterval); blinkInterval = null }
    blinkOn = true
  }

  input.addEventListener('input', () => {
    value = input.value
    cursorPos = input.selectionStart ?? value.length
    opts?.onChange?.(value)
    render()
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      opts?.onSubmit?.(value)
      render()
    }
    if (e.key === 'ArrowLeft') {
      cursorPos = Math.max(0, input.selectionStart ?? 0)
      render()
    }
    if (e.key === 'ArrowRight') {
      cursorPos = Math.min(value.length, input.selectionEnd ?? value.length)
      render()
    }
    if (e.key === 'Escape') { handle.blur() }
  })

  input.addEventListener('blur', () => {
    focused = false
    stopBlink()
    render()
  })

  // click the grid region → focus the input
  mounted.on('click', x, y, w, 1, () => handle.focus())

  render()

  const handle: TextInputHandle = {
    focus() {
      focused = true
      input.value = value
      input.focus()
      cursorPos = value.length
      input.setSelectionRange(cursorPos, cursorPos)
      startBlink()
      render()
    },
    blur() {
      focused = false
      input.blur()
      stopBlink()
      render()
    },
    getValue() { return value },
    setValue(v: string) {
      value = v
      input.value = v
      cursorPos = v.length
      render()
    },
    destroy() {
      stopBlink()
      document.body.removeChild(input)
    },
  }

  return handle
}
