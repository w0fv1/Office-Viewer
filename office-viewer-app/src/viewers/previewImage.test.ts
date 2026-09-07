import { describe, expect, it } from 'vitest'
import { normalizeImageOptions, selectImageContent } from './previewImageOptions'

describe('preview image contract', () => {
  it('defaults to the first page at a fixed pixel size', () => {
    expect(normalizeImageOptions({})).toEqual({ width: 1200, height: 1600, page: 1, timeSeconds: 0 })
  })
  it.each([{ width: 0 }, { height: 9000 }, { page: 1.2 }, { page: 0 }, { timeSeconds: -1 }, { width: NaN }])('rejects invalid options %j', (options) => {
    expect(() => normalizeImageOptions(options)).toThrow()
  })
  it('selects a worksheet without mutating the interactive preview', () => {
    const content = { kind: 'sheet' as const, tables: [{ name: 'A', rows: [['first']] }, { name: 'B', rows: [['second']] }] }
    expect(selectImageContent(content, normalizeImageOptions({ page: 2 }))).toEqual({ ...content, tables: [content.tables[1]] })
    expect(content.tables).toHaveLength(2)
    expect(() => selectImageContent(content, normalizeImageOptions({ page: 3 }))).toThrow(/PAGE_OUT_OF_RANGE/)
  })
  it('does not turn unsupported files or audio controls into preview images', () => {
    expect(() => selectImageContent({ kind: 'unsupported' }, normalizeImageOptions({}))).toThrow(/UNSUPPORTED/)
    expect(() => selectImageContent({ kind: 'media', media: 'audio', objectUrl: 'blob:a' }, normalizeImageOptions({}))).toThrow(/UNSUPPORTED/)
  })
  it('rejects timestamps for worksheets', () => {
    expect(() => selectImageContent({ kind: 'sheet', tables: [{ name: 'A', rows: [] }] }, normalizeImageOptions({ timeSeconds: 2 }))).toThrow(/INVALID_OPTIONS/)
  })
  it('rejects page selection for unpaginated text', () => {
    expect(() => selectImageContent({ kind: 'text', text: 'hello' }, normalizeImageOptions({ page: 2 }))).toThrow(/PAGE_OUT_OF_RANGE/)
  })
})
