import { extensionOf } from '../lib/format'
import type { FilePayload, ViewerDescriptor } from '../types'
import type { RenderKind } from './renderPayload'
import type { BasicViewerId } from './basicRenderer'

function loadWith(kind: RenderKind): ViewerDescriptor['load'] {
  return async (payload: FilePayload) => (await import('./renderPayload')).renderPayload(payload, kind)
}

function loadBasic(viewerId: BasicViewerId): ViewerDescriptor['load'] {
  return async (payload) => (await import('./basicRenderer')).renderBasicPayload(payload, viewerId)
}

const loadWord: ViewerDescriptor['load'] = async (payload) => {
  try {
    return await (await import('./documentParsers')).renderWordPayload(payload)
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}

export const viewerRegistry: ViewerDescriptor[] = [
  { id: 'word', label: 'Word / Text Document', extensions: ['docx', 'dotx', 'odt', 'rtf'], editable: false, load: loadWord },
  { id: 'spreadsheet', label: 'Excel / Spreadsheet', extensions: ['xls', 'xlsx', 'xlsm', 'csv', 'tsv', 'ods'], editable: false, load: loadWith('spreadsheet') },
  { id: 'presentation', label: 'PowerPoint', extensions: ['pptx', 'pptm'], editable: false, load: loadWith('presentation') },
  { id: 'pdf', label: 'PDF', extensions: ['pdf'], editable: false, load: loadWith('pdf') },
  { id: 'archive', label: 'Archive', extensions: ['zip', 'jar', 'vsix', 'apk', 'tar', 'tgz', 'tar.gz', '7z', 'rar'], editable: false, load: loadWith('archive') },
  { id: 'epub', label: 'EPUB', extensions: ['epub'], editable: false, load: loadWith('epub') },
  { id: 'xmind', label: 'XMind', extensions: ['xmind'], editable: false, load: loadWith('xmind') },
  { id: 'psd', label: 'PSD', extensions: ['psd'], editable: false, load: loadWith('psd') },
  { id: 'image', label: 'Image', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico'], editable: false, load: loadWith('image') },
  { id: 'tiff', label: 'TIFF', extensions: ['tif', 'tiff'], editable: false, load: loadWith('tiff') },
  { id: 'icns', label: 'ICNS', extensions: ['icns'], editable: false, load: loadWith('icns') },
  { id: 'svg', label: 'SVG', extensions: ['svg'], editable: false, load: loadBasic('svg') },
  { id: 'font', label: 'Font', extensions: ['ttf', 'otf', 'woff', 'woff2'], editable: false, load: loadWith('font') },
  { id: 'markdown', label: 'Markdown', extensions: ['md', 'markdown'], editable: true, load: loadBasic('markdown') },
  { id: 'html', label: 'HTML', extensions: ['html', 'htm', 'xhtml'], editable: false, load: loadBasic('html') },
  { id: 'json', label: 'JSON / Structured Text', extensions: ['json', 'yaml', 'yml', 'xml', 'toml'], editable: true, load: loadBasic('json') },
  { id: 'text', label: 'Text / Code', extensions: ['txt', 'log', 'js', 'ts', 'tsx', 'jsx', 'css', 'rs', 'py', 'go', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'sql', 'sh', 'ps1'], editable: true, load: loadBasic('text') },
]

export const fallbackViewer: ViewerDescriptor = {
  id: 'fallback',
  label: 'Fallback',
  extensions: [],
  editable: false,
  load: loadBasic('fallback'),
}

const viewersById = new Map([...viewerRegistry, fallbackViewer].map((viewer) => [viewer.id, viewer]))

export function resolveViewer(path: string): ViewerDescriptor {
  const extension = extensionOf(path)
  return viewerRegistry.find((viewer) => viewer.extensions.includes(extension)) ?? fallbackViewer
}

export function viewerById(id: string): ViewerDescriptor {
  return viewersById.get(id) ?? fallbackViewer
}
