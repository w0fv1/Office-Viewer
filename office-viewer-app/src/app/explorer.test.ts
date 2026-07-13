import { describe, expect, it } from 'vitest'
import type { FileEntry } from '../types'
import { adjacentVisibleFile, visibleEntries, visibleFileSequence } from './explorer'

const file = (name: string, overrides: Partial<FileEntry> = {}): FileEntry => ({
  name,
  path: `/workspace/${name}`,
  isDir: false,
  extension: name.includes('.') ? name.split('.').at(-1) : undefined,
  size: 0,
  ...overrides,
})

describe('explorer entries', () => {
  it('filters by file name without mutating the source list', () => {
    const entries = [file('report.docx'), file('notes.md'), file('slides.pptx')]
    const visible = visibleEntries(entries, { name: 'doc', extension: '' }, 'name')

    expect(visible.map((entry) => entry.name)).toEqual(['report.docx'])
    expect(entries.map((entry) => entry.name)).toEqual(['report.docx', 'notes.md', 'slides.pptx'])
  })

  it('filters files by one or more extensions', () => {
    const entries = [file('report.docx'), file('notes.md'), file('slides.pptx'), file('folder', { isDir: true, extension: undefined })]

    expect(visibleEntries(entries, { name: '', extension: '.docx, pptx' }, 'name').map((entry) => entry.name)).toEqual(['folder', 'report.docx', 'slides.pptx'])
  })

  it('combines name and extension filters', () => {
    const entries = [file('report.docx'), file('report.pdf'), file('notes.docx')]

    expect(visibleEntries(entries, { name: 'report', extension: 'docx' }, 'name').map((entry) => entry.name)).toEqual(['report.docx'])
  })

  it('keeps directories before files for every sort mode', () => {
    const entries = [file('b.txt'), file('folder', { isDir: true, extension: undefined }), file('a.txt')]

    expect(visibleEntries(entries, { name: '', extension: '' }, 'size').map((entry) => entry.name)).toEqual(['folder', 'a.txt', 'b.txt'])
  })

  it('sorts names naturally', () => {
    const entries = [file('file10.txt'), file('file2.txt'), file('file1.txt')]

    expect(visibleEntries(entries, { name: '', extension: '' }, 'name').map((entry) => entry.name)).toEqual(['file1.txt', 'file2.txt', 'file10.txt'])
  })

  it('sorts by type, size, and latest modified time', () => {
    const entries = [
      file('z.md', { size: 5, modified: 10 }),
      file('a.docx', { size: 20, modified: 30 }),
      file('b.txt', { size: 1, modified: 20 }),
    ]

    expect(visibleEntries(entries, { name: '', extension: '' }, 'type').map((entry) => entry.name)).toEqual(['a.docx', 'z.md', 'b.txt'])
    expect(visibleEntries(entries, { name: '', extension: '' }, 'size').map((entry) => entry.name)).toEqual(['b.txt', 'z.md', 'a.docx'])
    expect(visibleEntries(entries, { name: '', extension: '' }, 'modified').map((entry) => entry.name)).toEqual(['a.docx', 'b.txt', 'z.md'])
  })

  it('flattens visible files in tree order through expanded directories', () => {
    const docs = file('docs', { path: '/workspace/docs', isDir: true, extension: undefined })
    const root = [file('b.txt'), docs, file('a.txt')]
    const children = new Map([[docs.path, [file('d.md', { path: '/workspace/docs/d.md' }), file('c.md', { path: '/workspace/docs/c.md' })]]])
    const files = visibleFileSequence(root, children, new Set([docs.path]), { name: '', extension: '' }, 'name')

    expect(files.map((entry) => entry.path)).toEqual([
      '/workspace/docs/c.md',
      '/workspace/docs/d.md',
      '/workspace/a.txt',
      '/workspace/b.txt',
    ])
  })

  it('applies extension filters to flattened files inside expanded directories', () => {
    const docs = file('docs', { path: '/workspace/docs', isDir: true, extension: undefined })
    const root = [docs, file('a.txt')]
    const children = new Map([[docs.path, [file('b.md', { path: '/workspace/docs/b.md' }), file('c.txt', { path: '/workspace/docs/c.txt' })]]])

    expect(visibleFileSequence(root, children, new Set([docs.path]), { name: '', extension: 'md' }, 'name').map((entry) => entry.path)).toEqual(['/workspace/docs/b.md'])
  })

  it('finds adjacent visible files around the active path', () => {
    const root = [file('a.txt'), file('b.txt'), file('c.txt')]

    expect(adjacentVisibleFile(root, new Map(), new Set(), { name: '', extension: '' }, 'name', '/workspace/b.txt', 'previous')?.path).toBe('/workspace/a.txt')
    expect(adjacentVisibleFile(root, new Map(), new Set(), { name: '', extension: '' }, 'name', '/workspace/b.txt', 'next')?.path).toBe('/workspace/c.txt')
    expect(adjacentVisibleFile(root, new Map(), new Set(), { name: '', extension: '' }, 'name', '/workspace/a.txt', 'previous')).toBeUndefined()
  })
})
