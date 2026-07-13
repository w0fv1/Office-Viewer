import { describe, expect, it } from 'vitest'
import type { LoadState } from './previewTypes'
import { objectUrlsFrom } from './previewResources'

describe('preview resources', () => {
  it('collects top-level and archive object URLs without duplicates', () => {
    const state: LoadState = {
      status: 'ready',
      content: {
        kind: 'archive',
        items: [
          { name: 'a.png', directory: false, preview: { kind: 'image', objectUrl: 'blob:archive', mime: 'image/png' } },
          { name: 'b.png', directory: false, preview: { kind: 'image', objectUrl: 'blob:main', mime: 'image/png' } },
        ],
      },
    }

    expect(objectUrlsFrom(state)).toEqual(['blob:archive', 'blob:main'])
  })
})
