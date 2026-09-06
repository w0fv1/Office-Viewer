export type FileEntry = {
  name: string
  path: string
  isDir: boolean
  extension?: string
  size: number
  modified?: number
  created?: number
}

export type FilePayload = {
  path: string
  name: string
  extension?: string
  mime: string
  size: number
  modified?: number
  created?: number
  bytes: Uint8Array
}

export type ViewerDescriptor = {
  id: string
  label: string
  extensions: readonly string[]
  editable: boolean
  load: (payload: FilePayload) => Promise<LoadState>
  loadUrl?: (payload: UrlPayload) => Promise<LoadState>
}

export type FileMetadata = Omit<FilePayload, 'bytes'>
export type UrlPayload = FileMetadata & { url: string; signal?: AbortSignal }

export type OpenTab = {
  path: string
  name: string
  viewerId: string
}

export type SearchResult = {
  path: string
  name: string
  extension?: string
  lineNumber?: number
  preview: string
  matchKind: 'name' | 'content' | 'office-content' | 'pdf-content' | 'archive-entry'
}

export type SearchReport = {
  results: SearchResult[]
  scannedFiles: number
  skippedFiles: number
  issues: Array<{ path: string; message: string }>
}
import type { LoadState } from './viewers/previewTypes'
