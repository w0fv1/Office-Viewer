import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import JSZip from 'jszip'
import { resolveViewer } from './registry'
import { extensionOf } from '../lib/format'
import { objectUrlsFrom } from './previewResources'

const preview = (name: string, bytes: Uint8Array) => resolveViewer(name).load({ name, path: name, bytes, extension: extensionOf(name), size: bytes.length, mime: 'application/octet-stream' })

it.each(['heic', 'heif', 'parquet', 'cur', 'pjp', 'pjpeg', 'class', 'crx'])('registers .%s', (extension) => {
  expect(resolveViewer(`file.${extension}`).id).not.toBe('fallback')
})

describe('CRX archive', () => {
  it.each([2, 3])('reads CRX%s with its wrapper header', async (version) => {
    const zip = zipSync({ 'manifest.json': strToU8('{"name":"Preview"}') })
    const offset = version === 2 ? 24 : 20
    const bytes = new Uint8Array(offset + zip.length)
    bytes.set(strToU8('Cr24'))
    const view = new DataView(bytes.buffer)
    view.setUint32(4, version, true)
    view.setUint32(8, 8, true)
    bytes.set(zip, offset)
    const state = await preview('extension.crx', bytes)
    expect(state.status).toBe('ready')
    if (state.status === 'ready' && state.content.kind === 'archive') {
      expect(state.content.items[0].preview).toMatchObject({ kind: 'text', text: '{"name":"Preview"}' })
    } else throw new Error(JSON.stringify(state))
  })
  it('rejects a truncated header', async () => {
    expect((await preview('bad.crx', strToU8('Cr24'))).status).toBe('error')
  })
})

it('reads real Parquet pages, schema and large integer values', async () => {
  const bytes = new Uint8Array(readFileSync('samples/data.parquet'))
  const state = await preview('table.parquet', bytes)
  expect(state.status).toBe('ready')
  if (state.status !== 'ready' || state.content.kind !== 'parquet') throw new Error(JSON.stringify(state))
  expect(state.content.rowCount).toBe(3)
  expect(state.content.columns.map((c) => c.name)).toEqual(['name', 'value'])
  expect(await state.content.readRows(0, 1)).toEqual([['甲', '9007199254740993']])
  expect(await state.content.readRows(2, 3)).toEqual([['丙', '3']])
})

it('preserves XMind hierarchy as a visual map', async () => {
  const state = await preview('mind.xmind', new Uint8Array(readFileSync('samples/mind.xmind')))
  expect(state.status).toBe('ready')
  if (state.status !== 'ready' || state.content.kind !== 'xmind') throw new Error(JSON.stringify(state))
  expect(state.content.sheets[0].data.nodeData.topic).toBeTruthy()
  expect(state.content.sheets[0].data.nodeData.children?.length).toBeGreaterThan(0)
})

it('retains PPTX content for canvas rendering alongside slide text', async () => {
  const bytes = new Uint8Array(readFileSync('samples/slides.pptx'))
  const state = await preview('slides.pptx', bytes)
  expect(state.status).toBe('ready')
  if (state.status !== 'ready' || state.content.kind !== 'presentation') throw new Error(JSON.stringify(state))
  expect(state.content.source).toBe(bytes)
  expect(state.content.slides.length).toBeGreaterThan(0)
})

it('decodes a CUR containing a PNG image and tracks its resource', async () => {
  const png = readFileSync('samples/pixel.png')
  const bytes = new Uint8Array(22 + png.length)
  const header = new DataView(bytes.buffer)
  header.setUint16(2, 2, true)
  header.setUint16(4, 1, true)
  bytes[6] = 1
  bytes[7] = 1
  header.setUint32(14, png.length, true)
  header.setUint32(18, 22, true)
  bytes.set(png, 22)
  vi.stubGlobal('URL', class extends URL { static createObjectURL = () => 'blob:cursor' })
  try {
    const state = await preview('cursor.cur', bytes)
    expect(state).toMatchObject({ status: 'ready', content: { kind: 'media', objectUrl: 'blob:cursor' } })
    expect(objectUrlsFrom(state)).toEqual(['blob:cursor'])
  } finally { vi.unstubAllGlobals() }
})

it('follows the presentation slide order and its note relationships', async () => {
  const zip = await JSZip.loadAsync(readFileSync('samples/visual-slides.pptx'))
  const xml = await zip.file('ppt/presentation.xml')!.async('text')
  const ids = xml.match(/<p:sldId\s[^>]+\/>/g)!
  zip.file('ppt/presentation.xml', xml.replace(ids.join(''), [...ids].reverse().join('')))
  const state = await preview('reordered.pptx', await zip.generateAsync({ type: 'uint8array' }))
  if (state.status !== 'ready' || state.content.kind !== 'presentation') throw new Error(JSON.stringify(state))
  expect(state.content.slides[0].title).toContain('Slide 2')
  expect(state.content.slides[0].notes).toContain('Notes for slide 2')
})
