import { invoke } from '@tauri-apps/api/core'
import type { FileEntry, FilePayload, SearchReport } from '../types'

export function listDirectory(path: string, showHidden: boolean): Promise<FileEntry[]> {
  return invoke<FileEntry[]>('list_directory', { path, showHidden })
}

export function readFile(path: string): Promise<FilePayload> {
  return Promise.all([
    invoke<Omit<FilePayload, 'bytes'>>('read_file_metadata', { path }),
    invoke<ArrayBuffer>('read_file_bytes', { path }),
  ]).then(([metadata, bytes]) => ({ ...metadata, bytes: new Uint8Array(bytes) }))
}

export async function saveTextFile(path: string, content: string): Promise<FilePayload> {
  await invoke<void>('save_text_file', { path, content })
  return readFile(path)
}

export function hashFile(path: string): Promise<string> {
  return invoke<string>('hash_file', { path })
}

export function openInSystem(path: string): Promise<void> {
  return invoke<void>('open_in_system', { path })
}

export function revealInFileManager(path: string): Promise<void> {
  return invoke<void>('reveal_in_file_manager', { path })
}

export function searchWorkspace(root: string, query: string, showHidden: boolean): Promise<SearchReport> {
  return invoke<SearchReport>('search_workspace', { root, query, showHidden })
}
