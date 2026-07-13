import { beforeEach, describe, expect, it, vi } from 'vitest'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('@tauri-apps/api/core', () => ({ invoke }))

import { readFile, saveTextFile } from './backend'

const metadata = {
  path: 'C:\\workspace\\notes.md',
  name: 'notes.md',
  extension: 'md',
  mime: 'text/markdown',
  size: 3,
  modified: 1,
  created: 1,
}

describe('binary file IPC', () => {
  beforeEach(() => invoke.mockReset())

  it('combines metadata JSON with raw array-buffer content', async () => {
    invoke.mockImplementation((command: string) => command === 'read_file_metadata'
      ? Promise.resolve(metadata)
      : Promise.resolve(new Uint8Array([65, 66, 67]).buffer))

    const payload = await readFile(metadata.path)

    expect(payload).toEqual({ ...metadata, bytes: new Uint8Array([65, 66, 67]) })
    expect(invoke).toHaveBeenCalledWith('read_file_metadata', { path: metadata.path })
    expect(invoke).toHaveBeenCalledWith('read_file_bytes', { path: metadata.path })
  })

  it('reuses the canonical read path after saving', async () => {
    invoke.mockImplementation((command: string) => {
      if (command === 'save_text_file') return Promise.resolve()
      if (command === 'read_file_metadata') return Promise.resolve(metadata)
      return Promise.resolve(new Uint8Array([65, 66, 67]).buffer)
    })

    await saveTextFile(metadata.path, 'ABC')

    expect(invoke.mock.calls.map(([command]) => command)).toEqual(['save_text_file', 'read_file_metadata', 'read_file_bytes'])
  })
})
