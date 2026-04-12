import { build } from 'esbuild'
await build({
  entryPoints: ['packages/ui/src/index.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'example/ui-bundle.js',
})
console.log('built example/ui-bundle.js')
