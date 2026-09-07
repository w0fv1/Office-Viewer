import { invoke } from '@tauri-apps/api/core'
import { readFile } from './backend'
import { exportPreviewImage, type PreviewImageOptions } from '../viewers/previewImage'

export async function previewImage(path: string, options: PreviewImageOptions = {}, signal?: AbortSignal): Promise<Blob> {
  return exportPreviewImage(await readFile(path), options, signal)
}

export async function savePreviewImage(path: string, outputPath: string, options: PreviewImageOptions = {}): Promise<void> {
  const blob = await previewImage(path, options)
  await invoke('save_preview_image', { path: outputPath, bytes: Array.from(new Uint8Array(await blob.arrayBuffer())) })
}
