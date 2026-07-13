import { describe, expect, it } from 'vitest'
import { fallbackViewer, viewerRegistry } from './registry'

describe('viewer registry contract', () => {
  it('owns every extension exactly once', () => {
    const extensions = viewerRegistry.flatMap((viewer) => viewer.extensions)

    expect(new Set(extensions).size).toBe(extensions.length)
  })

  it('keeps the fallback outside extension resolution', () => {
    expect(fallbackViewer.extensions).toEqual([])
    expect(viewerRegistry).not.toContain(fallbackViewer)
  })
})
