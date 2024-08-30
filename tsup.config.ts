import { defineConfig } from 'tsup'

export default defineConfig({
  bundle: true,
  clean: true,
  dts: true,
  entry: ['src/**/*.ts', '!src/**/*.test.*'],
  format: 'esm',
  minify: true,
  outDir: 'lib',
  sourcemap: true,
  splitting: false,
})
