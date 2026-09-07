import type { PreviewContent } from './previewTypes'

export type PreviewImageOptions = { width?: number; height?: number; page?: number; timeSeconds?: number }
export type ImageOptions = Required<PreviewImageOptions>

export class PreviewImageError extends Error {
  readonly code: string
  constructor(code: string, message: string) { super(`${code}: ${message}`); this.code = code }
}

export function normalizeImageOptions(options: PreviewImageOptions): ImageOptions {
  const result = { width: options.width ?? 1200, height: options.height ?? 1600, page: options.page ?? 1, timeSeconds: options.timeSeconds ?? 0 }
  for (const key of ['width', 'height', 'page'] as const) {
    if (!Number.isSafeInteger(result[key]) || result[key] < 1) throw new PreviewImageError('INVALID_OPTIONS', `${key} must be a positive integer`)
  }
  if (result.width > 4096 || result.height > 4096 || !Number.isFinite(result.timeSeconds) || result.timeSeconds < 0) throw new PreviewImageError('INVALID_OPTIONS', 'Maximum image size is 4096 × 4096; timeSeconds must be nonnegative')
  return result
}

export function selectImageContent(content: PreviewContent, options: ImageOptions): PreviewContent {
  if (options.timeSeconds && !(content.kind === 'media' && content.media === 'video')) throw new PreviewImageError('INVALID_OPTIONS', 'timeSeconds is only supported for video')
  const index = options.page - 1
  const select = <T,>(items: T[]): T => {
    if (!items[index]) throw new PreviewImageError('PAGE_OUT_OF_RANGE', `Page ${options.page} exceeds ${items.length}`)
    return items[index]
  }
  if (content.kind === 'unsupported' || (content.kind === 'media' && content.media === 'audio')) throw new PreviewImageError('UNSUPPORTED', 'This file has no supported visual preview')
  if (content.kind === 'sheet') return { ...content, tables: [select(content.tables)] }
  if (content.kind === 'book') return { ...content, chapters: [select(content.chapters)] }
  if (content.kind === 'xmind') return { ...content, sheets: [select(content.sheets)] }
  if (content.kind === 'presentation' && !content.source) return { ...content, slides: [select(content.slides)] }
  if (content.kind !== 'pdf' && content.kind !== 'presentation' && content.kind !== 'parquet' && index !== 0) throw new PreviewImageError('PAGE_OUT_OF_RANGE', 'This format supports its first viewport only')
  return content
}
