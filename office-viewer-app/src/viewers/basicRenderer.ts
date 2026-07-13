import { marked } from 'marked'
import { bytesToText } from '../lib/bytes'
import { formatBytes } from '../lib/format'
import type { FilePayload } from '../types'
import { sanitizeHtml } from './html'
import type { HexSummary, LoadState } from './previewTypes'

export type BasicViewerId = 'markdown' | 'html' | 'svg' | 'json' | 'text' | 'fallback'

export async function renderBasicPayload(payload: FilePayload, viewerId: BasicViewerId): Promise<LoadState> {
  try {
    const text = bytesToText(payload.bytes)
    if (viewerId === 'markdown') {
      const html = await marked.parse(text, { async: false })
      return {
        status: 'ready',
        content: { kind: 'html', html: sanitizeHtml(html) },
        stats: [
          { label: '行数', value: String(text.split(/\r?\n/).length) },
          { label: '标题', value: String(Array.from(text.matchAll(/^#{1,6}\s/gm)).length) },
        ],
      }
    }
    if (viewerId === 'html') {
      return {
        status: 'ready',
        content: { kind: 'html', html: sanitizeHtml(text, { ADD_ATTR: ['target'] }) },
        stats: [{ label: '元素', value: String(Array.from(text.matchAll(/<[^/!][^>]*>/g)).length) }],
      }
    }
    if (viewerId === 'svg') {
      return {
        status: 'ready',
        content: { kind: 'html', html: `<div class="svg-wrap">${sanitizeHtml(text)}</div>` },
        stats: [{ label: '节点', value: String(Array.from(text.matchAll(/<[^/!][^>]*>/g)).length) }],
      }
    }
    if (viewerId === 'json' || viewerId === 'text') {
      const rendered = viewerId === 'json' && payload.extension === 'json' ? JSON.stringify(JSON.parse(text), null, 2) : text
      return {
        status: 'ready',
        content: { kind: 'text', text: rendered },
        stats: [
          { label: '行数', value: String(rendered.split(/\r?\n/).length) },
          { label: '字符', value: String(rendered.length) },
        ],
      }
    }
    const summary = createHexSummary(payload)
    return {
      status: 'ready',
      content: { kind: 'hex', summary },
      stats: [
        { label: 'Fallback', value: 'HEX' },
        { label: '采样', value: formatBytes(Math.min(payload.size, 1024)) },
      ],
    }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}

function createHexSummary(payload: FilePayload): HexSummary {
  const sample = payload.bytes.slice(0, 1024)
  const rows = []
  for (let offset = 0; offset < sample.length; offset += 16) {
    const chunk = sample.slice(offset, offset + 16)
    rows.push({
      offset: offset.toString(16).padStart(8, '0'),
      hex: Array.from(chunk).map((byte) => byte.toString(16).padStart(2, '0')).join(' '),
      ascii: Array.from(chunk).map((byte) => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.').join(''),
    })
  }
  const printable = sample.filter((byte) => byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126)).length
  const textPreview = sample.length > 0 && printable / sample.length > 0.75 ? bytesToText(payload.bytes).slice(0, 4000) : undefined
  return {
    intro: `没有可靠 viewer 可用于 ${payload.extension ?? 'unknown'}。已显示文件元信息、文本尝试和前 ${formatBytes(sample.length)} 的十六进制内容。`,
    textPreview,
    rows,
  }
}
