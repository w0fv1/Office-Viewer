import { useEffect, useState } from 'react'
import { formatBytes } from '../lib/format'
import type { FilePayload, OpenTab, ViewerDescriptor } from '../types'
import type { ArchiveItem, LoadState, PresentationSlide, SheetTable, WordOutlineItem } from './previewTypes'

export function Preview({ tab, viewer, payload, state }: { tab?: OpenTab; viewer?: ViewerDescriptor; payload: FilePayload | null; state: LoadState }) {
  if (!tab) return <div className="empty-view">打开一个文件以开始预览</div>
  if (state.status === 'loading') return <div className="empty-view">正在解析 {tab.name}...</div>
  if (state.status === 'error') return <div className="error-view">{state.message}</div>
  if (!payload || state.status !== 'ready') return <div className="empty-view">等待文件内容</div>

  const content = state.content
  if (content.kind === 'word') {
    return <WordPreview html={content.html} outline={content.outline} kind={viewer?.id ?? ''} />
  }
  if (content.kind === 'html') {
    return <article className={`document-view ${viewer?.id ?? ''}`} dangerouslySetInnerHTML={{ __html: content.html }} />
  }
  if (content.kind === 'sheet') return <SheetPreview tables={content.tables} />
  if (content.kind === 'presentation') return <PresentationPreview slides={content.slides} />
  if (content.kind === 'archive') return <ArchivePreview items={content.items} />
  if (content.kind === 'epub') {
    const epub = content.summary
    return (
      <div className="summary-view">
        <h1>{epub.title || payload.name}</h1>
        <p>{epub.creator || 'Unknown creator'}</p>
        <p className="path">{epub.packagePath}</p>
        <h2>Spine / Chapters</h2>
        <ol>{epub.chapters.map((chapter) => <li key={chapter}>{chapter}</li>)}</ol>
      </div>
    )
  }
  if (content.kind === 'xmind') {
    const xmind = content.summary
    return (
      <div className="summary-view">
        <h1>{xmind.title || payload.name}</h1>
        <h2>Topics</h2>
        <ul>{xmind.topics.map((topic, index) => <li key={`${topic}-${index}`}>{topic}</li>)}</ul>
      </div>
    )
  }
  if (content.kind === 'psd') {
    const psd = content.summary
    return (
      <div className="summary-view">
        <h1>{payload.name}</h1>
        <p>{psd.width} x {psd.height}px, {psd.layerCount} layers</p>
        <h2>Layers</h2>
        <ul>{psd.layers.map((layer, index) => <li key={`${layer}-${index}`}>{layer}</li>)}</ul>
      </div>
    )
  }
  if (content.kind === 'hex') {
    const hex = content.summary
    return (
      <div className="hex-view">
        <div className="hex-intro">{hex.intro}</div>
        {hex.textPreview && (
          <>
            <h2>文本尝试预览</h2>
            <pre>{hex.textPreview}</pre>
          </>
        )}
        <h2>十六进制预览</h2>
        <table>
          <tbody>
            {hex.rows.map((row) => (
              <tr key={row.offset}>
                <th>{row.offset}</th>
                <td>{row.hex}</td>
                <td>{row.ascii}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  if (content.kind === 'cfb') {
    return (
      <div className="summary-view">
        <h1>{payload.name}</h1>
        <p>旧版 Office 二进制复合文档。未识别到可直接渲染的工作表单元格，已切换为容器结构预览。</p>
        <h2>Streams</h2>
        <ul>{content.summary.entries.map((entry) => <li key={entry.name}>{entry.name} ({formatBytes(entry.size)})</li>)}</ul>
      </div>
    )
  }
  if (content.kind === 'media') {
    return <div className="media-view"><img src={content.objectUrl} alt={payload.name} /></div>
  }
  if (content.kind === 'pdf') {
    return (
      <div className="pdf-layout">
        <iframe className="pdf-view" title={payload.name} src={content.objectUrl} />
        <aside className="pdf-text">
          <h2>文本预览</h2>
          <pre>{content.summary.text || '未提取到可搜索文本。'}</pre>
        </aside>
      </div>
    )
  }
  if (content.kind === 'font') {
    return (
      <div className="font-view" style={{ fontFamily: 'PreviewFont' }}>
        <style>{`@font-face{font-family:PreviewFont;src:url("${content.objectUrl}")}`}</style>
        <h1>Office Viewer</h1>
        <p>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
        <p>abcdefghijklmnopqrstuvwxyz</p>
        <p>0123456789 本地优先的全能文件浏览器</p>
      </div>
    )
  }
  return <pre className="text-view">{content.text}</pre>
}

function WordPreview({ html, outline, kind }: { html: string; outline: WordOutlineItem[]; kind: string }) {
  return (
    <div className="word-layout">
      <article className={`document-view ${kind}`} dangerouslySetInnerHTML={{ __html: html }} />
      <aside className="word-outline">
        <h2>大纲</h2>
        {outline.length === 0 && <p>未检测到标题。</p>}
        {outline.map((item, index) => (
          <div key={`${item.text}-${index}`} style={{ paddingLeft: (item.level - 1) * 12 }}>
            <span>H{item.level}</span>
            <strong>{item.text}</strong>
          </div>
        ))}
      </aside>
    </div>
  )
}

function PresentationPreview({ slides }: { slides: PresentationSlide[] }) {
  const [selectedIndex, setSelectedIndex] = useState(slides[0]?.index ?? 1)
  const selected = slides.find((slide) => slide.index === selectedIndex) ?? slides[0]

  useEffect(() => {
    setSelectedIndex(slides[0]?.index ?? 1)
  }, [slides])

  return (
    <div className="presentation-view">
      <div className="slide-list">
        {slides.map((slide) => (
          <button
            key={slide.index}
            type="button"
            className={selected?.index === slide.index ? 'active' : ''}
            onClick={() => setSelectedIndex(slide.index)}
          >
            <span>{slide.index}</span>
            <strong>{slide.title}</strong>
          </button>
        ))}
      </div>
      <section className="slide-detail">
        <h1>{selected?.title ?? '没有幻灯片'}</h1>
        <pre>{selected?.text || '没有找到幻灯片文本。'}</pre>
        <h2>备注</h2>
        <pre>{selected?.notes || '没有备注。'}</pre>
      </section>
    </div>
  )
}

function SheetPreview({ tables }: { tables: SheetTable[] }) {
  const [selectedName, setSelectedName] = useState(tables[0]?.name ?? '')
  const selected = tables.find((table) => table.name === selectedName) ?? tables[0]

  useEffect(() => {
    setSelectedName(tables[0]?.name ?? '')
  }, [tables])

  return (
    <div className="sheet-view">
      {tables.length > 1 && (
        <div className="sheet-tabs">
          {tables.map((table) => (
            <button
              key={table.name}
              type="button"
              className={selected?.name === table.name ? 'active' : ''}
              onClick={() => setSelectedName(table.name)}
            >
              {table.name}
            </button>
          ))}
        </div>
      )}
      <table>
        <tbody>
          {(selected?.rows ?? []).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ArchivePreview({ items }: { items: ArchiveItem[] }) {
  const firstPreviewable = items.find((item) => item.preview)
  const [selectedName, setSelectedName] = useState(firstPreviewable?.name ?? '')
  const selected = items.find((item) => item.name === selectedName && item.preview) ?? firstPreviewable

  useEffect(() => {
    setSelectedName(firstPreviewable?.name ?? '')
  }, [firstPreviewable?.name])

  return (
    <div className="archive-view">
      <div className="archive-list">
        {items.map((item) => (
          <button
            key={item.name}
            type="button"
            className={selected?.name === item.name ? 'archive-row active' : 'archive-row'}
            disabled={!item.preview}
            onClick={() => item.preview && setSelectedName(item.name)}
            title={item.name}
          >
            <span>{item.directory ? '目录' : item.preview ? '预览' : '文件'}</span>
            <strong>{item.name}</strong>
            <em>{item.size === undefined ? '' : formatBytes(item.size)}</em>
          </button>
        ))}
      </div>
      <div className="archive-preview">
        {selected?.preview?.kind === 'image' && <img src={selected.preview.objectUrl} alt={selected.name} />}
        {selected?.preview?.kind === 'text' && <pre>{selected.preview.text}</pre>}
        {selected?.preview?.kind === 'unsupported' && <p>{selected.preview.message}</p>}
        {!selected?.preview && <p>选择一个可预览的压缩包条目。</p>}
      </div>
    </div>
  )
}
