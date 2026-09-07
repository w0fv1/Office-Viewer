import type { createServer as CreateServer, Plugin } from 'vite'
import { fileURLToPath } from 'node:url'

export function previewCapabilitiesPlugin(createServer: typeof CreateServer): Plugin {
  return {
    name: 'office-preview-capabilities',
    apply: 'build',
    async buildStart() {
      const server = await createServer({ configFile: false, root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' })
      try {
        const { previewCapabilities } = await server.ssrLoadModule('/src/viewers/registry.ts')
        this.emitFile({ type: 'asset', fileName: 'capabilities.json', source: JSON.stringify({ viewers: previewCapabilities(), unknownFormat: 'text-detection', imageFormat: 'image/png', defaultWidth: 1200, defaultHeight: 1600, maximumDimension: 4096 }) })
      } finally { await server.close() }
    },
  }
}
