import { createRequire } from 'module'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const wasmPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../core/pkg/dotart_core.js')
const wasm = require(wasmPath)

export function fromBuffer(
  rgba: Uint8Array,
  width: number,
  height: number,
  cols: number,
  charset: string,
  globalContrast: number,
  edgeContrast: number,
): Uint8Array {
  return wasm.from_buffer(rgba, width, height, cols, charset, globalContrast, edgeContrast)
}
