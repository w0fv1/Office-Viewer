import { describe, expect, it, vi } from 'vitest'
import { resolveViewer } from './registry'
import { objectUrlsFrom } from './previewResources'

const pdf = vi.hoisted(() => ({
  destroy: vi.fn(async () => {}),
  getPage: vi.fn(async () => ({ getTextContent: async () => ({ items: [{ str: 'PDF content' }] }) })),
}))
const getDocument = vi.hoisted(() => vi.fn(() => ({ promise: Promise.resolve({ numPages: 1, ...pdf }), destroy: pdf.destroy })))
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({ GlobalWorkerOptions: {}, getDocument }))

describe('URL-backed previews', () => {
  it.each([['movie.mp4', 'media'], ['song.flac', 'media'], ['photo.png', 'media'], ['font.woff2', 'font']])('can load %s without a complete byte buffer', async (name, kind) => {
    const url = 'http://127.0.0.1:31400/token/file'
    const state = await resolveViewer(name).loadUrl!({ path: name, name, size: 4 * 1024 ** 3, mime: 'application/octet-stream', url })
    expect(state).toMatchObject({ status: 'ready', content: { kind, objectUrl: url } })
    expect(objectUrlsFrom(state)).toEqual([])
  })

  it('keeps byte-based document parsers on the existing load path', () => {
    for (const name of ['report.docx', 'table.xlsx', 'unknown.norm']) expect(resolveViewer(name).loadUrl).toBeUndefined()
  })

  it('uses PDF range loading and releases the document after extracting text', async () => {
    const url = 'http://127.0.0.1:31400/token/file'
    const state = await resolveViewer('large.pdf').loadUrl!({ path: 'large.pdf', name: 'large.pdf', size: 1024 ** 3, mime: 'application/pdf', url })
    expect(state).toMatchObject({ content: { kind: 'pdf', objectUrl: url, summary: { pages: 1, text: 'PDF content' } } })
    expect(getDocument).toHaveBeenCalledWith(expect.objectContaining({ url, disableAutoFetch: true, disableStream: true }))
    expect(pdf.destroy).toHaveBeenCalled()
  })
})
