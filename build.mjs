import { build } from 'esbuild'

try {
  await build({
    entryPoints: ['../packages/ui/src/index.ts'],
    bundle: true,
    format: 'esm',
    outfile: 'ui-bundle.js',
    external: [],
  })
  console.log('built ui-bundle.js')
} catch (e) {
  console.error(e.errors)
  process.exit(1)
}
