import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { FilePayload } from '../types'
import type { LoadState, PreviewContent } from './previewTypes'
import { renderPayload } from './renderPayload'
import { viewerById } from './registry'

type ReadyState = Extract<LoadState, { status: 'ready' }>

const archivePayload = (name: string, mime: string): FilePayload => {
  const path = `samples/${name}`
  const bytes = readFileSync(path)
  return {
    path,
    name,
    extension: name.endsWith('.tar.gz') ? 'tar.gz' : name.split('.').at(-1),
    mime,
    size: bytes.length,
    modified: 0,
    created: 0,
    bytes: new Uint8Array(bytes),
  }
}

function readyState(state: LoadState): ReadyState {
  if (state.status === 'error') throw new Error(state.message)
  expect(state.status).toBe('ready')
  if (state.status !== 'ready') throw new Error(`Expected ready state, got ${state.status}`)
  return state
}

function previewContent<K extends PreviewContent['kind']>(state: ReadyState, kind: K): Extract<PreviewContent, { kind: K }> {
  expect(state.content.kind).toBe(kind)
  if (state.content.kind !== kind) throw new Error(`Expected ${kind} content, got ${state.content.kind}`)
  return state.content as Extract<PreviewContent, { kind: K }>
}

describe('archive rendering', () => {
  it('loads preview text from a zip entry', async () => {
    const state = readyState(await renderPayload(archivePayload('bundle.zip', 'application/zip'), 'archive'))
    const item = previewContent(state, 'archive').items.find((entry) => entry.name === 'nested/info.json')
    expect(item?.preview?.kind).toBe('text')
    if (item?.preview?.kind === 'text') {
      expect(item.preview.text).toContain('"ok":true')
    }
  })

  it('loads preview text from a gzipped tar entry', async () => {
    const state = readyState(await renderPayload(archivePayload('bundle.tar.gz', 'application/gzip'), 'archive'))
    const item = previewContent(state, 'archive').items.find((entry) => entry.name === 'nested/info.json')
    expect(item?.preview?.kind).toBe('text')
    if (item?.preview?.kind === 'text') {
      expect(item.preview.text).toContain('"tar":true')
    }
  })
})

describe('word rendering', () => {
  it('extracts outline headings from a real docx file', async () => {
    const bytes = readFileSync('samples/report.docx')
    const state = readyState(await viewerById('word').load({
      path: 'samples/report.docx',
      name: 'report.docx',
      extension: 'docx',
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: bytes.length,
      modified: 0,
      created: 0,
      bytes: new Uint8Array(bytes),
    }))

    expect(previewContent(state, 'word').outline).toEqual([
      { level: 1, text: 'Office Viewer DOCX sample' },
      { level: 2, text: 'Local document preview' },
    ])
  })

  it('extracts outline and html from a real odt file', async () => {
    const bytes = readFileSync('samples/article.odt')
    const state = readyState(await viewerById('word').load({
      path: 'samples/article.odt',
      name: 'article.odt',
      extension: 'odt',
      mime: 'application/vnd.oasis.opendocument.text',
      size: bytes.length,
      modified: 0,
      created: 0,
      bytes: new Uint8Array(bytes),
    }))

    const content = previewContent(state, 'word')
    expect(content.html).toContain('<h1>Office Viewer ODT sample</h1>')
    expect(content.outline).toEqual([
      { level: 1, text: 'Office Viewer ODT sample' },
      { level: 2, text: 'Local OpenDocument preview' },
    ])
  })

  it('extracts outline and html from a real rtf file', async () => {
    const bytes = readFileSync('samples/memo.rtf')
    const state = readyState(await viewerById('word').load({
      path: 'samples/memo.rtf',
      name: 'memo.rtf',
      extension: 'rtf',
      mime: 'application/rtf',
      size: bytes.length,
      modified: 0,
      created: 0,
      bytes: new Uint8Array(bytes),
    }))

    const content = previewContent(state, 'word')
    expect(content.html).toContain('<h1>Office Viewer RTF sample</h1>')
    expect(content.outline).toEqual([
      { level: 1, text: 'Office Viewer RTF sample' },
      { level: 2, text: 'Local rich text preview' },
    ])
  })
})

describe('pdf rendering', () => {
  it('extracts page count and text from a real pdf file', async () => {
    const bytes = readFileSync('samples/brief.pdf')
    const state = readyState(await renderPayload({
      path: 'samples/brief.pdf',
      name: 'brief.pdf',
      extension: 'pdf',
      mime: 'application/pdf',
      size: bytes.length,
      modified: 0,
      created: 0,
      bytes: new Uint8Array(bytes),
    }, 'pdf'))
    const content = previewContent(state, 'pdf')
    expect(content.summary.pages).toBe(1)
    expect(content.summary.text).toContain('Office Viewer PDF sample')
  })
})

describe('spreadsheet rendering', () => {
  it('parses quoted delimiters and multiline CSV cells', async () => {
    const csv = new TextEncoder().encode('name,description\n"Office, Viewer","line one\nline two"')
    const state = readyState(await renderPayload({
      path: 'samples/quoted.csv',
      name: 'quoted.csv',
      extension: 'csv',
      mime: 'text/csv',
      size: csv.length,
      modified: 0,
      created: 0,
      bytes: csv,
    }, 'spreadsheet'))

    expect(previewContent(state, 'sheet').tables[0]?.rows).toEqual([
      ['name', 'description'],
      ['Office, Viewer', 'line one\nline two'],
    ])
  })

  it('loads all worksheets from a real xlsx file', async () => {
    const bytes = readFileSync('samples/formats.xlsx')
    const state = readyState(await renderPayload({
      path: 'samples/formats.xlsx',
      name: 'formats.xlsx',
      extension: 'xlsx',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: bytes.length,
      modified: 0,
      created: 0,
      bytes: new Uint8Array(bytes),
    }, 'spreadsheet'))

    const content = previewContent(state, 'sheet')
    expect(content.tables.map((table) => table.name)).toEqual(['Formats', 'Metadata'])
    expect(content.tables[1]?.rows.flat()).toContain('Local first')
  })

  it('loads all sheets from a real ods file', async () => {
    const bytes = readFileSync('samples/formats.ods')
    const state = readyState(await renderPayload({
      path: 'samples/formats.ods',
      name: 'formats.ods',
      extension: 'ods',
      mime: 'application/vnd.oasis.opendocument.spreadsheet',
      size: bytes.length,
      modified: 0,
      created: 0,
      bytes: new Uint8Array(bytes),
    }, 'spreadsheet'))

    const content = previewContent(state, 'sheet')
    expect(content.tables.map((table) => table.name)).toEqual(['Formats', 'Metadata'])
    expect(content.tables[1]?.rows.flat()).toContain('Office Viewer')
  })
})

describe('presentation rendering', () => {
  it('loads slide text and speaker notes from a real pptx file', async () => {
    const bytes = readFileSync('samples/slides.pptx')
    const state = readyState(await renderPayload({
      path: 'samples/slides.pptx',
      name: 'slides.pptx',
      extension: 'pptx',
      mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      size: bytes.length,
      modified: 0,
      created: 0,
      bytes: new Uint8Array(bytes),
    }, 'presentation'))

    const content = previewContent(state, 'presentation')
    expect(content.slides).toHaveLength(2)
    expect(content.slides[0]?.text).toContain('Office Viewer PPTX sample slide')
    expect(content.slides[0]?.notes).toContain('Speaker note for slide one')
    expect(content.slides[1]?.text).toContain('Structured slide extraction')
  })
})
