import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { toBlob } from 'html-to-image'
import type { FileMetadata, FilePayload } from '../types'
import { Preview } from './Preview'
import { resolveViewer } from './registry'
import { loadPreview } from './loadPreview'
import { objectUrlsFrom } from './previewResources'
import type { LoadState, PreviewContent } from './previewTypes'
import { normalizeImageOptions, PreviewImageError, selectImageContent, type PreviewImageOptions } from './previewImageOptions'
import { renderImageCanvas } from './previewImageCanvas'
import '../App.css'
import './previewImage.css'

export { normalizeImageOptions, PreviewImageError } from './previewImageOptions'
export type { PreviewImageOptions } from './previewImageOptions'

export async function exportPreviewImage(payload: FilePayload | (FileMetadata & { url: string }), options: PreviewImageOptions = {}, signal = AbortSignal.timeout(30000)): Promise<Blob> {
  const settings = normalizeImageOptions(options)
  let state: LoadState = { status: 'idle' }
  let onAbort = () => {}
  const abort = new Promise<never>((_, reject) => {
    onAbort = () => reject(new PreviewImageError('RENDER_TIMEOUT', 'Preview image rendering was cancelled or timed out'))
    signal.addEventListener('abort', onAbort, { once: true })
  })
  const render = async () => {
    signal.throwIfAborted()
    state = 'url' in payload ? await loadPreview(payload, payload.url, signal) : await resolveViewer(payload.name).load(payload)
    try {
      signal.throwIfAborted()
      if (state.status !== 'ready') throw new PreviewImageError('RENDER_FAILED', state.status === 'error' ? state.message : 'Preview is not ready')
      let content = selectImageContent(state.content, settings)
      const canvas = await renderImageCanvas(content, settings, signal)
      if (canvas) return canvas
      if (content.kind === 'parquet') {
        const start = (settings.page - 1) * 100
        if (start >= Math.max(1, content.rowCount)) throw new PreviewImageError('PAGE_OUT_OF_RANGE', 'Parquet page exceeds row count')
        content = { kind: 'sheet', tables: [{ name: 'Rows', rows: [content.columns.map((column) => column.name), ...await content.readRows(start, Math.min(start + 100, content.rowCount))] }] }
      }
      return await renderPreviewDom(payload, content, settings, signal)
    } finally { objectUrlsFrom(state).forEach((url) => URL.revokeObjectURL(url)) }
  }
  try { return await Promise.race([render(), abort]) }
  finally { signal.removeEventListener('abort', onAbort) }
}

export async function renderPreviewDom(payload: FileMetadata, content: PreviewContent, settings: Required<PreviewImageOptions>, signal: AbortSignal): Promise<Blob> {
  const element = document.createElement('div')
  element.className = 'preview-image-export'
  Object.assign(element.style, { position: 'fixed', left: '-20000px', top: '0', width: `${settings.width}px`, height: `${settings.height}px` })
  document.body.appendChild(element)
  const root = createRoot(element)
  const viewer = resolveViewer(payload.name)
  let disposed = false
  const dispose = () => { if (!disposed) { disposed = true; root.unmount(); element.remove() } }
  signal.addEventListener('abort', dispose, { once: true })
  try {
    flushSync(() => root.render(<Preview tab={{ path: payload.path, name: payload.name, viewerId: viewer.id }} viewer={viewer} payload={payload} state={{ status: 'ready', content }} />))
    await new Promise<void>((resolve, reject) => {
      const check = () => {
        if (signal.aborted) { cleanup(); reject(signal.reason); return }
        const error = element.querySelector('.error-view')
        if (error) { cleanup(); reject(new PreviewImageError('RENDER_FAILED', error.textContent ?? 'Rendering failed')); return }
        if (!element.querySelector('.empty-view, [data-preview-ready="false"]')) { cleanup(); resolve() }
      }
      const observer = new MutationObserver(check)
      const cleanup = () => { observer.disconnect(); signal.removeEventListener('abort', check) }
      observer.observe(element, { subtree: true, childList: true, characterData: true, attributes: true })
      signal.addEventListener('abort', check, { once: true })
      check()
    })
    await document.fonts.ready
    await Promise.all(Array.from(element.querySelectorAll('img')).map((image) => image.decode()))
    signal.throwIfAborted()
    const blob = await toBlob(element, { width: settings.width, height: settings.height, pixelRatio: 1, backgroundColor: '#ffffff', style: { position: 'static', left: '0', top: '0' }, onImageErrorHandler: () => { throw new PreviewImageError('DECODE_FAILED', 'An embedded image could not be decoded') } })
    if (!blob) throw new PreviewImageError('RENDER_FAILED', 'PNG encoding failed')
    return blob
  } finally { signal.removeEventListener('abort', dispose); dispose() }
}
