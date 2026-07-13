import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from './documentParsers'

describe('html sanitization', () => {
  it('removes executable markup and event handlers', () => {
    const sanitized = sanitizeHtml('<img src="x" onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">x</a>')

    expect(sanitized).not.toContain('onerror')
    expect(sanitized).not.toContain('<script')
    expect(sanitized).not.toContain('javascript:')
  })
})
