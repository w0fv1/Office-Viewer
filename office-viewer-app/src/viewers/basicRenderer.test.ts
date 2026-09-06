import { describe, expect, it } from 'vitest'
import { resolveViewer } from './registry'

function preview(bytes: Uint8Array, name = 'document.norm') {
  return resolveViewer(name).load({ name, path: name, extension: name.split('.').at(-1), mime: 'application/octet-stream', size: bytes.length, bytes })
}

describe('text detection', () => {
  it.each(['中文正文\n第二行\t表格内容', '日本語と emoji 🌳', '<script>literal text</script>', '', '正文'.repeat(5000)])('shows complete readable text without fallback information', async (text) => {
    expect(await preview(new TextEncoder().encode(text))).toEqual({ status: 'ready', content: { kind: 'text', text } })
  })

  it.each(['README', '.env', 'unknown.norm'])('detects text regardless of filename: %s', async (name) => {
    expect(await preview(new TextEncoder().encode('PORT=32500'), name)).toMatchObject({ content: { kind: 'text', text: 'PORT=32500' } })
  })

  it.each([false, true])('decodes UTF-16 with a BOM, big endian: %s', async (bigEndian) => {
    const text = '中文\nUTF-16 🌳'
    const bytes = new Uint8Array(2 + text.length * 2)
    const view = new DataView(bytes.buffer)
    view.setUint16(0, 0xfeff, !bigEndian)
    for (let index = 0; index < text.length; index++) view.setUint16(2 + index * 2, text.charCodeAt(index), !bigEndian)
    expect(await preview(bytes)).toEqual({ status: 'ready', content: { kind: 'text', text } })
  })

  it.each([
    new Uint8Array([0, 1, 2, 3]),
    new Uint8Array([0xc3, 0x28]),
    new Uint8Array([0xff, 0xfe, 65]),
    new TextEncoder().encode('text\u0001binary'),
    new TextEncoder().encode('readable header'.repeat(1000) + '\u0000binary tail'),
  ])('shows only unsupported for non-text bytes', async (bytes) => {
    expect(await preview(bytes)).toEqual({ status: 'ready', content: { kind: 'unsupported' } })
  })

  it('does not render binary as text just because it has a txt extension', async () => {
    expect(await preview(new Uint8Array([0, 1, 2]), 'binary.txt')).toMatchObject({ content: { kind: 'unsupported' } })
  })
})
