import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      // mirrors compilerOptions.paths["@/*"] in tsconfig.json — update both if the src layout moves
      '@': path.resolve(dirname, './src'),
    },
  },
})
