import type { PreviewContent } from './previewTypes'
import { PreviewImageError, type ImageOptions } from './previewImageOptions'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import { presentationEngine } from './presentationEngine'

export function canvasPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new PreviewImageError('RENDER_FAILED', 'PNG encoding failed')), 'image/png'))
}

export function containCanvas(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, options: ImageOptions): HTMLCanvasElement {
  if (!sourceWidth || !sourceHeight) throw new PreviewImageError('RENDER_FAILED', 'Empty visual content')
  const canvas = document.createElement('canvas')
  canvas.width = options.width
  canvas.height = options.height
  const context = canvas.getContext('2d')!
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  const scale = Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  context.drawImage(source, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
  return canvas
}

export async function renderImageCanvas(content: PreviewContent, options: ImageOptions, signal: AbortSignal): Promise<Blob | null> {
  if (content.kind === 'pdf') {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
    const task = pdfjs.getDocument({ url: content.objectUrl })
    const abort = () => { void task.destroy() }
    signal.addEventListener('abort', abort, { once: true })
    try {
      const pdf = await task.promise
      if (options.page > pdf.numPages) throw new PreviewImageError('PAGE_OUT_OF_RANGE', `PDF contains ${pdf.numPages} pages`)
      const page = await pdf.getPage(options.page)
      const original = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: Math.min(options.width / original.width, options.height / original.height) })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      await page.render({ canvas, viewport }).promise
      return canvasPng(containCanvas(canvas, canvas.width, canvas.height, options))
    } finally { signal.removeEventListener('abort', abort); await task.destroy() }
  }
  if (content.kind === 'presentation' && content.source) {
    const { PPTXViewer } = await presentationEngine()
    const canvas = document.createElement('canvas')
    canvas.width = options.width
    canvas.height = options.height
    const viewer = new PPTXViewer({ canvas, slideSizeMode: 'fit', backgroundColor: '#ffffff', autoChartRerenderDelayMs: 0 })
    try {
      await viewer.loadFile(content.source)
      signal.throwIfAborted()
      if (options.page > viewer.getSlideCount()) throw new PreviewImageError('PAGE_OUT_OF_RANGE', `Presentation contains ${viewer.getSlideCount()} slides`)
      await viewer.goToSlide(options.page - 1, canvas)
      await document.fonts.ready
      return canvasPng(containCanvas(canvas, canvas.width, canvas.height, options))
    } finally { viewer.destroy() }
  }
  if (content.kind === 'media' && content.media === 'video') {
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'auto'
    const wait = (event: string) => new Promise<void>((resolve, reject) => {
      const done = () => { cleanup(); resolve() }
      const failed = () => { cleanup(); reject(new PreviewImageError('DECODE_FAILED', video.error?.message ?? 'Cannot decode video')) }
      const aborted = () => { cleanup(); reject(signal.reason) }
      const cleanup = () => { video.removeEventListener(event, done); video.removeEventListener('error', failed); signal.removeEventListener('abort', aborted) }
      video.addEventListener(event, done, { once: true }); video.addEventListener('error', failed, { once: true }); signal.addEventListener('abort', aborted, { once: true })
    })
    try {
      const loaded = wait('loadeddata')
      video.src = content.objectUrl
      await loaded
      if (options.timeSeconds >= video.duration) throw new PreviewImageError('TIME_OUT_OF_RANGE', 'Requested frame is past the video duration')
      if (options.timeSeconds !== 0) { const seek = wait('seeked'); video.currentTime = options.timeSeconds; await seek }
      return canvasPng(containCanvas(video, video.videoWidth, video.videoHeight, options))
    } finally { video.pause(); video.removeAttribute('src'); video.load() }
  }
  if (content.kind === 'psd' || (content.kind === 'media' && content.media !== 'audio')) {
    const image = new Image()
    image.src = content.objectUrl
    await image.decode()
    signal.throwIfAborted()
    return canvasPng(containCanvas(image, image.naturalWidth, image.naturalHeight, options))
  }
  return null
}
