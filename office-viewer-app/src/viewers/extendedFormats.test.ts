import { readFileSync } from 'node:fs'
import JSZip from 'jszip'
import { gzipSync } from 'fflate'
import { describe, expect, it, vi } from 'vitest'
import { resolveViewer } from './registry'
import { extensionOf } from '../lib/format'
import { objectUrlsFrom } from './previewResources'

function preview(name: string, bytes: Uint8Array) {
  return resolveViewer(name).load({ name, path: name, extension: extensionOf(name), mime: 'application/octet-stream', size: bytes.length, bytes })
}

const odf = (body: string) => `<?xml version="1.0"?><o:document xmlns:o="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:t="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:d="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:p="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" xmlns:s="urn:oasis:names:tc:opendocument:xmlns:table:1.0"><o:body>${body}</o:body></o:document>`

describe('Office templates and variants', () => {
  it('does not substitute a binary container dump for an unreadable spreadsheet', async () => {
    const CFB = await import('cfb')
    const container = CFB.utils.cfb_new()
    CFB.utils.cfb_add(container, 'unrelated', new Uint8Array([1, 2, 3]))
    const bytes = new Uint8Array(CFB.write(container, { type: 'array' }))
    expect(await preview('file.xls', bytes)).toEqual({ status: 'ready', content: { kind: 'unsupported' } })
  })
  it.each([
    ['report.docx', 'docm', 'word'], ['report.docx', 'dotm', 'word'],
    ['report.docx', 'dotx', 'word'], ['formats.xlsx', 'xltx', 'sheet'],
    ['formats.xlsx', 'xltm', 'sheet'], ['slides.pptx', 'ppsx', 'presentation'],
    ['slides.pptx', 'ppsm', 'presentation'], ['slides.pptx', 'potx', 'presentation'],
    ['slides.pptx', 'potm', 'presentation'], ['article.odt', 'ott', 'word'],
    ['formats.ods', 'ots', 'sheet'],
  ])('reads %s content using .%s', async (sample, extension, kind) => {
    const state = await preview(`sample.${extension}`, new Uint8Array(readFileSync(`samples/${sample}`)))
    expect(state.status, JSON.stringify(state)).toBe('ready')
    if (state.status === 'ready') expect(state.content.kind).toBe(kind)
  })

  it.each(['odp', 'otp', 'fodp'])('reads .%s slides and separates notes using XML namespaces', async (extension) => {
    const xml = odf('<o:presentation><d:page d:name="第一页"><d:frame p:class="title"><t:p>报告标题</t:p></d:frame><d:frame><t:p>正文<t:s t:c="2"/>内容<t:line-break/>下一行</t:p></d:frame><p:notes><t:p>仅备注</t:p></p:notes></d:page><d:page d:name="第二页"><t:p>第二页内容</t:p></d:page></o:presentation>')
    const bytes = extension === 'fodp' ? new TextEncoder().encode(xml) : await new JSZip().file('content.xml', xml).generateAsync({ type: 'uint8array' })
    const state = await preview(`slides.${extension}`, bytes)
    expect(state.status, JSON.stringify(state)).toBe('ready')
    if (state.status === 'ready' && state.content.kind === 'presentation') {
      expect(state.content.slides).toHaveLength(2)
      expect(state.content.slides[0]).toMatchObject({ title: '报告标题', notes: '仅备注' })
      expect(state.content.slides[0].text).toContain('正文  内容\n下一行')
      expect(state.content.slides[0].text).not.toContain('仅备注')
    } else throw new Error('Expected presentation')
  })

  it('renders flat OpenDocument text with heading levels', async () => {
    const state = await preview('note.fodt', new TextEncoder().encode(odf('<o:text><t:h t:outline-level="2">标题</t:h><t:p>正文 &amp; 内容</t:p></o:text>')))
    expect(state).toMatchObject({ content: { kind: 'word', outline: [{ level: 2, text: '标题' }] } })
  })

  it('renders flat spreadsheets with repeated empty cells and numeric values', async () => {
    const state = await preview('table.fods', new TextEncoder().encode(odf('<o:spreadsheet><s:table s:name="数据"><s:table-row><s:table-cell s:number-columns-repeated="2"/><s:table-cell o:value="42"/><s:table-cell><t:p>文本</t:p></s:table-cell></s:table-row></s:table></o:spreadsheet>')))
    expect(state).toMatchObject({ content: { kind: 'sheet', tables: [{ name: '数据', rows: [['', '', '42', '文本']] }] } })
  })

  it('rejects invalid OpenDocument content instead of showing an empty viewer', async () => {
    expect((await preview('broken.odp', await new JSZip().file('other.xml', '<x/>').generateAsync({ type: 'uint8array' }))).status).toBe('error')
    expect((await preview('broken.fodt', new TextEncoder().encode('<broken>'))).status).toBe('error')
  })
})

describe('email, books and media', () => {
  it('renders compressed SVG with active content removed', async () => {
    const state = await preview('drawing.svgz', gzipSync(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><text>图形</text><script>bad()</script></svg>')))
    expect(state).toMatchObject({ content: { kind: 'html', html: expect.stringContaining('图形') } })
    if (state.status === 'ready' && state.content.kind === 'html') expect(state.content.html).not.toContain('<script')
  })

  it('renders comic archive images in natural page order', async () => {
    const zip = new JSZip().file('10.png', new Uint8Array([10])).file('2.png', new Uint8Array([2])).file('1.png', new Uint8Array([1])).file('readme.txt', 'ignored')
    const state = await preview('comic.cbz', await zip.generateAsync({ type: 'uint8array' }))
    expect(state).toMatchObject({ content: { kind: 'book' } })
    if (state.status === 'ready' && state.content.kind === 'book') {
      expect(state.content.chapters.map(page => page.title)).toEqual(['1.png', '2.png', '10.png'])
      expect(state.content.chapters[0].html).toContain('data:image/png;base64,')
    }
  })

  it('decodes MIME email headers and sanitizes the message body', async () => {
    const email = 'From: Sender <sender@example.com>\r\nTo: Receiver <receiver@example.com>\r\nSubject: =?UTF-8?B?5Lit5paH?=\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<h1>邮件正文</h1><script>alert(1)</script>'
    const state = await preview('mail.eml', new TextEncoder().encode(email))
    expect(state).toMatchObject({ content: { kind: 'email', subject: '中文' } })
    if (state.status === 'ready' && state.content.kind === 'email') {
      expect(state.content.html).toContain('邮件正文')
      expect(state.content.html).not.toContain('<script')
      expect(state.content.from).toContain('sender@example.com')
    }
  })

  it('shows EPUB chapter bodies in spine order', async () => {
    const zip = new JSZip().file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>')
      .file('OPS/book.opf', '<package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>测试书</dc:title></metadata><manifest><item id="a" href="a.xhtml"/><item id="b" href="b.xhtml"/></manifest><spine><itemref idref="b"/><itemref idref="a"/></spine></package>')
      .file('OPS/a.xhtml', '<html><body><h1>甲</h1><p>第一章正文</p></body></html>')
      .file('OPS/b.xhtml', '<html><body><h1>乙</h1><p>第二章正文</p><script>bad()</script></body></html>')
    const state = await preview('book.epub', await zip.generateAsync({ type: 'uint8array' }))
    expect(state).toMatchObject({ content: { kind: 'book', title: '测试书' } })
    if (state.status === 'ready' && state.content.kind === 'book') {
      expect(state.content.chapters.map(chapter => chapter.title)).toEqual(['乙', '甲'])
      expect(state.content.chapters[0].html).toContain('第二章正文')
      expect(state.content.chapters[0].html).not.toContain('<script')
    }
  })

  it('renders FictionBook chapters as escaped text', async () => {
    const xml = '<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0"><description><title-info><book-title>故事</book-title></title-info></description><body><section><title><p>开篇</p></title><p>内容 &lt;script&gt;</p></section></body></FictionBook>'
    expect(await preview('book.fb2', new TextEncoder().encode(xml))).toMatchObject({ content: { kind: 'book', title: '故事', chapters: [{ title: '开篇', html: expect.stringContaining('&lt;script&gt;') }] } })
  })

  it.each([['sound.mp3', 'audio', 'audio/mpeg'], ['sound.wav', 'audio', 'audio/wav'], ['video.mp4', 'video', 'video/mp4'], ['video.webm', 'video', 'video/webm']])('uses the correct media type for %s and exposes its URL for cleanup', async (name, media, mime) => {
    const create = vi.fn((_blob: Blob) => 'blob:media')
    vi.stubGlobal('URL', class extends URL { static createObjectURL = create })
    try {
      const state = await preview(name, new Uint8Array([1, 2, 3]))
      expect(state).toMatchObject({ content: { kind: 'media', media, objectUrl: 'blob:media' } })
      expect(create.mock.calls[0]?.[0]).toHaveProperty('type', mime)
      expect(objectUrlsFrom(state)).toEqual(['blob:media'])
    } finally { vi.unstubAllGlobals() }
  })
})
