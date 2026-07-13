import createDOMPurify, { type Config } from 'dompurify'

const htmlSanitizer = typeof window === 'undefined' ? undefined : createDOMPurify(window)

export function sanitizeHtml(value: string, options?: Config): string {
  if (!htmlSanitizer) throw new Error('HTML sanitizer is unavailable')
  return htmlSanitizer.sanitize(value, options)
}
