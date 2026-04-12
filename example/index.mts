import { fromFile } from '../packages/renderer/src/index.js'
import { writeFileSync } from 'fs'

const r = await fromFile('./example/dark.jpg', {
  cols: 80,
  mode: 'block',
  globalContrast: 2.0,
  edgeContrast: 1.5,
})

writeFileSync('./example/out.html', `<!DOCTYPE html>
<html><head><style>
body{background:#0a0a0a;margin:40px}
pre{font-family:monospace;font-size:12px;line-height:1.0;letter-spacing:0;white-space:pre}
</style></head><body><pre>${r.toHTML()}</pre></body></html>`)

console.log('rows:', r.rows, 'cols:', r.cols, 'cells:', r.cells.length)
console.log('wrote example/out.html')
