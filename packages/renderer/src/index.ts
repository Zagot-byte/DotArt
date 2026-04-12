import { execFile } from 'child_process'
import { promisify } from 'util'

const exec = promisify(execFile)

export const CHARSETS = {
  photo: '⠀⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿⣿',
  ui:    ' ░▒▓█▀▄▌▐─│╱╲╳╭╮╯╰┌┐└┘',
  block: ' ░▒▓█',
}

export async function fromFile(path: string, opts: {
  cols?: number
  charset?: string
  mode?: keyof typeof CHARSETS
  globalContrast?: number
  edgeContrast?: number
} = {}) {
  const cols = opts.cols ?? 80
  const charset = opts.charset ?? CHARSETS[opts.mode ?? 'block']
  const globalContrast = opts.globalContrast ?? 2.0
  const edgeContrast = opts.edgeContrast ?? 1.5

  const { stdout } = await exec('uv', [
    'run', '--project', `${process.env.HOME}/mayz`,
    'ascii-render', path,
    '--width', String(cols),
    '--color',
    '--global-contrast', String(globalContrast),
    '--edge-contrast', String(edgeContrast),
    '--charset', charset,
     
  ])

  return parseANSI(stdout, cols)
}

function parseANSI(ansi: string, cols: number) {
  // ANSI color format: \x1b[38;2;R;G;Bm{char}\x1b[0m
  const cells: { char: string; r: number; g: number; b: number }[] = []
  const lines = ansi.split('\n').filter(l => l.trim() !== '')

  for (const line of lines) {
    let i = 0
    let lineChars = 0
    while (i < line.length && lineChars < cols) {
      if (line[i] === '\x1b' && line[i+1] === '[') {
        // parse escape sequence
        const end = line.indexOf('m', i)
        if (end === -1) break
        const code = line.slice(i+2, end)
        i = end + 1
        if (code.startsWith('38;2;')) {
          const [r, g, b] = code.slice(5).split(';').map(Number)
          const char = line[i] ?? ' '
          cells.push({ char, r, g, b })
          i++
          lineChars++
        }
        // skip reset codes \x1b[0m
      } else {
        cells.push({ char: line[i], r: 200, g: 200, b: 200 })
        i++
        lineChars++
      }
    }
  }

  const rows = lines.length

  return {
    cols,
    rows,
    cells,
    toString() {
      let out = ''
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          out += cells[r * cols + c]?.char ?? ' '
        }
        if (r < rows - 1) out += '\n'
      }
      return out
    },
    toHTML() {
      let html = ''
      let curColor = ''
      let buf = ''
      const flush = () => {
        if (buf) html += `<span style="color:rgb(${curColor})">${buf}</span>`
        buf = ''
      }
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = cells[r * cols + c]
          if (!cell) continue
          const color = `${cell.r},${cell.g},${cell.b}`
          if (color !== curColor) { flush(); curColor = color }
          buf += cell.char === '<' ? '&lt;' : cell.char === '&' ? '&amp;' : cell.char
        }
        flush()
        if (r < rows - 1) html += '\n'
      }
      flush()
      return html
    }
  }
}
