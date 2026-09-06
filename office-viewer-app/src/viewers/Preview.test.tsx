import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Preview } from './Preview'
import type { LoadState } from './previewTypes'

const payload = { name: 'file.norm', path: 'file.norm', bytes: new Uint8Array(), size: 0, mime: 'application/octet-stream' }
const tab = { path: payload.path, name: payload.name, viewerId: 'fallback' }
const render = (state: LoadState) => <Preview tab={tab} payload={payload} state={state} />

describe('preview content', () => {
  it('shows a single unsupported message without technical fallback content', () => {
    const html = renderToStaticMarkup(render({ status: 'ready', content: { kind: 'unsupported' } }))
    expect(html).toContain('不支持预览此文件')
    expect(html).not.toMatch(/Fallback|HEX|十六进制|元信息|文本尝试/)
  })

  it('escapes detected text rather than interpreting it as HTML', () => {
    expect(renderToStaticMarkup(render({ status: 'ready', content: { kind: 'text', text: '<script>text</script>' } }))).toContain('&lt;script&gt;text&lt;/script&gt;')
  })

  it('shows media controls without autoplay and reports a decoder failure', async () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    try {
      await act(async () => root.render(render({ status: 'ready', content: { kind: 'media', media: 'video', objectUrl: 'blob:test' } })))
      const video = container.querySelector('video')
      expect(video?.controls).toBe(true)
      expect(video?.autoplay).toBe(false)
      await act(async () => video!.dispatchEvent(new Event('error')))
      expect(container.textContent).toBe('不支持预览此文件')
    } finally { await act(async () => root.unmount()) }
  })

  it('switches between actual book chapter bodies', async () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    try {
      await act(async () => root.render(render({ status: 'ready', content: { kind: 'book', title: '书', creator: '', chapters: [{ title: '第一章', html: '<p>甲正文</p>' }, { title: '第二章', html: '<p>乙正文</p>' }] } })))
      expect(container.querySelector('article')?.textContent).toBe('甲正文')
      await act(async () => (container.querySelectorAll('button')[1] as HTMLButtonElement).click())
      expect(container.querySelector('article')?.textContent).toBe('乙正文')
    } finally { await act(async () => root.unmount()) }
  })
})
