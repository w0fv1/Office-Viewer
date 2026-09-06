import { useEffect, useState } from 'react'
import type { PreviewContent } from './previewTypes'

export function JavaPreview({ bytes }: { bytes: Uint8Array }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    setText('')
    setError('')
    const worker = new Worker(new URL('./java.worker.ts', import.meta.url), { type: 'module' })
    const timeout = window.setTimeout(() => { worker.terminate(); setError('反编译超时，请使用专用工具打开此文件') }, 30000)
    worker.onmessage = (event: MessageEvent<{ text?: string; error?: string }>) => {
      window.clearTimeout(timeout)
      setText(event.data.text ?? '')
      setError(event.data.error ?? '')
      worker.terminate()
    }
    worker.onerror = () => { window.clearTimeout(timeout); worker.terminate(); setError('无法加载 Java 反编译器') }
    worker.postMessage(bytes)
    return () => { window.clearTimeout(timeout); worker.terminate() }
  }, [bytes])
  if (error) return <div className="error-view">{error}</div>
  return text ? <pre className="text-view">{text}</pre> : <div className="empty-view">正在反编译...</div>
}

export function ParquetPreview({ content }: { content: Extract<PreviewContent, { kind: 'parquet' }> }) {
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<string[][]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const pageSize = 100
  const pages = Math.max(1, Math.ceil(content.rowCount / pageSize))
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const result = content.rowCount ? content.readRows(page * pageSize, (page + 1) * pageSize) : Promise.resolve([])
    result.then((next) => { if (active) setRows(next) }).catch((reason: unknown) => { if (active) setError(String(reason)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [content, page])
  return <div className="parquet-view">
    <div className="preview-toolbar">
      <button disabled={page === 0 || loading} onClick={() => setPage(page - 1)}>上一页</button>
      <span>第 {page + 1} / {pages} 页 · 共 {content.rowCount} 行</span>
      <button disabled={page + 1 >= pages || loading} onClick={() => setPage(page + 1)}>下一页</button>
    </div>
    {error ? <div className="error-view">{error}</div> : loading ? <div className="empty-view">正在读取...</div> : <div className="sheet-view">
      <table><thead><tr>{content.columns.map((column) => <th key={column.name}>{column.name}<small>{column.type}</small></th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>}
  </div>
}
