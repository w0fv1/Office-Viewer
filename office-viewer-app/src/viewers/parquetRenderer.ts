import { asyncBufferFromUrl, parquetMetadataAsync, parquetReadObjects, parquetSchema } from 'hyparquet'
import type { AsyncBuffer } from 'hyparquet'
import { compressors } from 'hyparquet-compressors'
import type { FilePayload, UrlPayload } from '../types'
import { bytesToArrayBuffer } from '../lib/bytes'
import type { LoadState } from './previewTypes'

export async function renderParquet(payload: FilePayload | UrlPayload): Promise<LoadState> {
  try {
    const file: AsyncBuffer = 'url' in payload
      ? await asyncBufferFromUrl({ url: payload.url, byteLength: payload.size, requestInit: { signal: payload.signal } })
      : bytesToArrayBuffer(payload.bytes)
    const metadata = await parquetMetadataAsync(file)
    const columns = parquetSchema(metadata).children.map(({ element }) => ({
      name: element.name,
      type: element.logical_type?.type ?? element.converted_type ?? element.type ?? 'GROUP',
    }))
    const rowCount = Number(metadata.num_rows)
    return {
      status: 'ready',
      content: {
        kind: 'parquet', columns, rowCount,
        readRows: async (start, end) => {
          const rows = await parquetReadObjects({ file, metadata, compressors, rowStart: start, rowEnd: Math.min(end, rowCount) })
          return rows.map((row) => columns.map(({ name }) => parquetCell(row[name])))
        },
      },
      stats: [{ label: '行数', value: String(rowCount) }, { label: '列数', value: String(columns.length) }],
    }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}

function parquetCell(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value, (_, item: unknown) => typeof item === 'bigint' ? String(item) : item)
  return String(value)
}
