import { open } from '@tauri-apps/plugin-dialog'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Command, Copy, FileArchive, FileText, FolderOpen, LocateFixed, RefreshCw, Search, Settings, X } from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { adjacentVisibleFile, type SortMode, visibleEntries } from './app/explorer'
import { CommandPalette } from './app/CommandPalette'
import { activeHistoryPath, canGoBack, canGoForward, emptyNavigation, goBack, goForward, recordOpen } from './app/navigation'
import { WorkspaceTree } from './app/WorkspaceTree'
import { bytesToText } from './lib/bytes'
import { hashFile, listDirectory, openInSystem, readFile, revealInFileManager, saveTextFile, searchWorkspace } from './lib/backend'
import { formatBytes, formatTime } from './lib/format'
import type { FileEntry, FilePayload, OpenTab, SearchReport, SearchResult } from './types'
import { Preview } from './viewers/Preview'
import type { LoadState } from './viewers/previewTypes'
import { objectUrlsFrom } from './viewers/previewResources'
import { resolveViewer, viewerById } from './viewers/registry'

const sortModes: Array<{ mode: SortMode; label: string }> = [
  { mode: 'name', label: '名称' },
  { mode: 'type', label: '类型' },
  { mode: 'size', label: '大小' },
  { mode: 'modified', label: '时间' },
]

function App() {
  const [workspacePath, setWorkspacePath] = useState('')
  const [rootEntries, setRootEntries] = useState<FileEntry[]>([])
  const [childrenByPath, setChildrenByPath] = useState<Map<string, FileEntry[]>>(new Map())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [tabs, setTabs] = useState<OpenTab[]>([])
  const [activePath, setActivePath] = useState('')
  const [payload, setPayload] = useState<FilePayload | null>(null)
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' })
  const [filter, setFilter] = useState('')
  const [extensionFilter, setExtensionFilter] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('name')
  const [showHidden, setShowHidden] = useState(false)
  const [message, setMessage] = useState('选择一个文件夹开始浏览真实文件。')
  const [contentQuery, setContentQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchIssues, setSearchIssues] = useState<SearchReport['issues']>([])
  const [searching, setSearching] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [navigation, setNavigation] = useState(emptyNavigation)
  const [editing, setEditing] = useState(false)
  const [editorText, setEditorText] = useState('')
  const [fileHash, setFileHash] = useState('')
  const openRequest = useRef(0)

  const activeTab = tabs.find((tab) => tab.path === activePath)
  const activeViewer = activeTab ? viewerById(activeTab.viewerId) : undefined
  const explorerFilter = useMemo(() => ({ name: filter, extension: extensionFilter }), [extensionFilter, filter])
  const filteredRootEntries = useMemo(() => visibleEntries(rootEntries, explorerFilter, sortMode), [explorerFilter, rootEntries, sortMode])
  const previousFile = useMemo(() => adjacentVisibleFile(rootEntries, childrenByPath, expanded, explorerFilter, sortMode, activePath, 'previous'), [activePath, childrenByPath, expanded, explorerFilter, rootEntries, sortMode])
  const nextFile = useMemo(() => adjacentVisibleFile(rootEntries, childrenByPath, expanded, explorerFilter, sortMode, activePath, 'next'), [activePath, childrenByPath, expanded, explorerFilter, rootEntries, sortMode])
  const backAvailable = canGoBack(navigation)
  const forwardAvailable = canGoForward(navigation)
  const activeEditable = Boolean(activeViewer?.editable)
  const editorDirty = Boolean(payload && editorText !== bytesToText(payload.bytes))

  const loadDirectory = useCallback(async (path: string) => {
    const entries = await listDirectory(path, showHidden)
    setChildrenByPath((previous) => {
      const next = new Map(previous)
      next.set(path, entries)
      return next
    })
    return entries
  }, [showHidden])

  const openWorkspace = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false, title: '打开文件夹' })
    if (typeof selected !== 'string') return
    setWorkspacePath(selected)
    setMessage('正在读取文件夹...')
    const entries = await listDirectory(selected, showHidden)
    setRootEntries(entries)
    setChildrenByPath(new Map([[selected, entries]]))
    setExpanded(new Set([selected]))
    setMessage(`已打开 ${selected}`)
  }, [showHidden])

  const openTab = useCallback(async (tab: OpenTab, recordNavigation: boolean) => {
    const viewer = viewerById(tab.viewerId)
    const request = openRequest.current + 1
    openRequest.current = request
    setTabs((previous) => {
      if (previous.some((item) => item.path === tab.path)) return previous
      return [...previous, tab]
    })
    if (recordNavigation) {
      setNavigation((previous) => recordOpen(previous, tab))
    }
    setActivePath(tab.path)
    setEditing(false)
    setEditorText('')
    setFileHash('')
    setLoadState({ status: 'loading' })
    setMessage(`正在打开 ${tab.name}`)
    try {
      const nextPayload = await readFile(tab.path)
      const nextState = await viewer.load(nextPayload)
      if (openRequest.current !== request) {
        for (const url of objectUrlsFrom(nextState)) URL.revokeObjectURL(url)
        return
      }
      setPayload(nextPayload)
      setLoadState(nextState)
      setMessage(`${tab.name} 已由 ${viewer.label} 打开`)
    } catch (error) {
      if (openRequest.current !== request) return
      setPayload(null)
      setLoadState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }, [])

  const openFilePath = useCallback(async (path: string, name?: string) => {
    const tabName = name ?? fileNameFromPath(path)
    await openTab({ path, name: tabName, viewerId: resolveViewer(path).id }, true)
  }, [openTab])

  const navigateHistory = useCallback(async (direction: 'back' | 'forward') => {
    const next = direction === 'back' ? goBack(navigation) : goForward(navigation)
    const target = activeHistoryPath(next)
    if (!target || target === activePath) return
    setNavigation(next)
    const tab = tabs.find((item) => item.path === target) ?? navigation.recent.find((item) => item.path === target) ?? {
      path: target,
      name: fileNameFromPath(target),
      viewerId: resolveViewer(target).id,
    }
    await openTab(tab, false)
  }, [activePath, navigation, openTab, tabs])

  const navigateVisibleFile = useCallback(async (direction: 'previous' | 'next') => {
    const target = direction === 'previous' ? previousFile : nextFile
    if (!target) return
    await openFilePath(target.path, target.name)
  }, [nextFile, openFilePath, previousFile])

  const openSingleFile = useCallback(async () => {
    const selected = await open({ directory: false, multiple: false, title: '打开文件' })
    if (typeof selected !== 'string') return
    await openFilePath(selected)
  }, [openFilePath])

  const toggleDirectory = useCallback(async (entry: FileEntry) => {
    if (!entry.isDir) {
      await openFilePath(entry.path, entry.name)
      return
    }
    const next = new Set(expanded)
    if (next.has(entry.path)) {
      next.delete(entry.path)
      setExpanded(next)
      return
    }
    next.add(entry.path)
    setExpanded(next)
    if (!childrenByPath.has(entry.path)) {
      await loadDirectory(entry.path)
    }
  }, [childrenByPath, expanded, loadDirectory, openFilePath])

  const refreshWorkspace = useCallback(async () => {
    if (!workspacePath) return
    const entries = await listDirectory(workspacePath, showHidden)
    setRootEntries(entries)
    setChildrenByPath(new Map([[workspacePath, entries]]))
    setExpanded(new Set([workspacePath]))
  }, [showHidden, workspacePath])

  const runContentSearch = useCallback(async () => {
    if (!workspacePath || !contentQuery.trim()) {
      setSearchResults([])
      setSearchIssues([])
      return
    }
    setSearching(true)
    setMessage(`正在搜索 "${contentQuery}"`)
    try {
      const report = await searchWorkspace(workspacePath, contentQuery, showHidden)
      setSearchResults(report.results)
      setSearchIssues(report.issues)
      const incomplete = report.issues.length > 0 ? `，${report.skippedFiles} 个文件失败` : ''
      setMessage(`搜索完成：扫描 ${report.scannedFiles} 个文件，${report.results.length} 个结果${incomplete}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setSearching(false)
    }
  }, [contentQuery, showHidden, workspacePath])

  const copyActivePath = useCallback(async () => {
    if (!activeTab) return
    await navigator.clipboard.writeText(activeTab.path)
    setMessage(`已复制路径：${activeTab.path}`)
  }, [activeTab])

  const revealActiveFile = useCallback(async () => {
    if (!activeTab) return
    await revealInFileManager(activeTab.path)
  }, [activeTab])

  const calculateHash = useCallback(async () => {
    if (!activeTab) return
    setMessage(`正在计算 ${activeTab.name} 的 SHA-256`)
    try {
      const hash = await hashFile(activeTab.path)
      setFileHash(hash)
      setMessage(`${activeTab.name} 的 SHA-256 已计算`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }, [activeTab])

  const startEditing = useCallback(() => {
    if (!payload || !activeEditable) return
    setEditorText(bytesToText(payload.bytes))
    setEditing(true)
  }, [activeEditable, payload])

  const cancelEditing = useCallback(() => {
    setEditing(false)
    setEditorText('')
  }, [])

  const saveEditor = useCallback(async () => {
    if (!activeTab || !editing) return
    setMessage(`正在保存 ${activeTab.name}`)
    try {
      const nextPayload = await saveTextFile(activeTab.path, editorText)
      setPayload(nextPayload)
      setLoadState(await viewerById(activeTab.viewerId).load(nextPayload))
      setEditing(false)
      setEditorText('')
      setMessage(`${activeTab.name} 已保存`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }, [activeTab, editing, editorText])

  const closeTab = useCallback((path: string) => {
    setTabs((previous) => previous.filter((tab) => tab.path !== path))
    if (activePath === path) {
      const remaining = tabs.filter((tab) => tab.path !== path)
      const next = remaining.at(-1)
      if (next) {
        void openTab(next, false)
      } else {
        setActivePath('')
        setPayload(null)
        setLoadState({ status: 'idle' })
      }
    }
  }, [activePath, openTab, tabs])

  useEffect(() => {
    const urls = objectUrlsFrom(loadState)
    return () => {
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [loadState])

  useEffect(() => {
    if (workspacePath) {
      refreshWorkspace().catch((error) => setMessage(String(error)))
    }
  }, [refreshWorkspace, workspacePath])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((value) => !value)
      }
      if (event.key === 'Escape') {
        setCommandOpen(false)
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && editing) {
        event.preventDefault()
        void saveEditor()
      }
      if (event.altKey && event.key === 'ArrowUp') {
        event.preventDefault()
        void navigateVisibleFile('previous')
      }
      if (event.altKey && event.key === 'ArrowDown') {
        event.preventDefault()
        void navigateVisibleFile('next')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editing, navigateVisibleFile, saveEditor])

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <FileArchive size={20} />
          <div>
            <strong>Office Viewer</strong>
            <span>{workspacePath || '本地优先文件浏览工作台'}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button type="button" onClick={openWorkspace}>
            <FolderOpen size={16} />
            打开文件夹
          </button>
          <button type="button" onClick={openSingleFile}>
            <FileText size={16} />
            打开文件
          </button>
          <button type="button" onClick={() => setCommandOpen(true)}>
            <Command size={16} />
            命令
          </button>
          <button type="button" onClick={() => void navigateHistory('back')} disabled={!backAvailable} title="后退">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={() => void navigateHistory('forward')} disabled={!forwardAvailable} title="前进">
            <ChevronRight size={16} />
          </button>
          <button type="button" onClick={() => void navigateVisibleFile('previous')} disabled={!previousFile} title="上一文件">
            <ChevronUp size={16} />
          </button>
          <button type="button" onClick={() => void navigateVisibleFile('next')} disabled={!nextFile} title="下一文件">
            <ChevronDown size={16} />
          </button>
          <button type="button" onClick={refreshWorkspace} disabled={!workspacePath} title="刷新">
            <RefreshCw size={16} />
          </button>
          <button type="button" className={showHidden ? 'active' : ''} onClick={() => setShowHidden((value) => !value)}>
            <Settings size={16} />
            隐藏文件
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <div className="searchbox">
            <Search size={15} />
            <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="按文件名过滤" />
          </div>
          <div className="extension-filter">
            <input value={extensionFilter} onChange={(event) => setExtensionFilter(event.target.value)} placeholder="扩展名筛选，例如 docx,pdf" />
            {extensionFilter && <button type="button" onClick={() => setExtensionFilter('')}>清空</button>}
          </div>
          <div className="sortbar">
            {sortModes.map((item) => (
              <button key={item.mode} type="button" className={sortMode === item.mode ? 'active' : ''} onClick={() => setSortMode(item.mode)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="content-search">
            <input
              value={contentQuery}
              onChange={(event) => setContentQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void runContentSearch()
              }}
              placeholder="搜索文本内容"
            />
            <button type="button" onClick={runContentSearch} disabled={!workspacePath || searching}>
              <Search size={14} />
            </button>
          </div>
          <div className="tree">
            {searchIssues.length > 0 && (
              <details className="search-issues">
                <summary>{searchIssues.length} 个搜索问题</summary>
                {searchIssues.slice(0, 10).map((issue) => <p key={`${issue.path}:${issue.message}`} title={issue.message}>{issue.path}</p>)}
              </details>
            )}
            {searchResults.length > 0 ? (
              <div className="search-results">
                {searchResults.map((result) => (
                  <button key={`${result.path}:${result.lineNumber ?? 0}:${result.matchKind}`} type="button" className="search-result" onClick={() => openFilePath(result.path, result.name)}>
                    <strong>{result.name}</strong>
                    <span>{searchResultLabel(result)}</span>
                    <em>{result.preview}</em>
                  </button>
                ))}
              </div>
            ) : workspacePath ? (
              filteredRootEntries.map((entry) => (
                <WorkspaceTree
                  key={entry.path}
                  entry={entry}
                  depth={0}
                  activePath={activePath}
                  childrenByPath={childrenByPath}
                  expanded={expanded}
                  filter={explorerFilter}
                  sortMode={sortMode}
                  onToggle={toggleDirectory}
                  onOpen={(file) => openFilePath(file.path, file.name)}
                />
              ))
            ) : (
              <div className="empty-pane">尚未打开文件夹</div>
            )}
          </div>
        </aside>

        <section className="preview-column">
          <nav className="tabs">
            {tabs.length === 0 ? (
              <span className="tab-placeholder">点击左侧文件，或直接打开单个文件</span>
            ) : (
              tabs.map((tab) => (
                <button
                  key={tab.path}
                  type="button"
                  className={tab.path === activePath ? 'tab active' : 'tab'}
                  onClick={() => openFilePath(tab.path, tab.name)}
                >
                  <span>{tab.name}</span>
                  <X size={14} onClick={(event) => {
                    event.stopPropagation()
                    closeTab(tab.path)
                  }} />
                </button>
              ))
            )}
          </nav>
          <section className="viewer-surface">
            {editing ? (
              <textarea className="editor-view" value={editorText} onChange={(event) => setEditorText(event.target.value)} spellCheck={false} />
            ) : (
              <Preview tab={activeTab} viewer={activeViewer} payload={payload} state={loadState} />
            )}
          </section>
        </section>

        <aside className="inspector">
          <h2>信息</h2>
          {payload && activeTab ? (
            <dl>
              <dt>文件名</dt>
              <dd>{payload.name}</dd>
              <dt>类型</dt>
              <dd>{activeViewer?.label}</dd>
              <dt>大小</dt>
              <dd>{formatBytes(payload.size)}</dd>
              <dt>MIME</dt>
              <dd>{payload.mime}</dd>
              <dt>修改时间</dt>
              <dd>{formatTime(payload.modified)}</dd>
              <dt>SHA-256</dt>
              <dd className="hash">{fileHash || <button type="button" onClick={calculateHash}>按需计算</button>}</dd>
              <dt>路径</dt>
              <dd className="path">{payload.path}</dd>
              {loadState.status === 'ready' && loadState.stats?.map((stat) => (
                <Fragment key={stat.label}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </Fragment>
              ))}
            </dl>
          ) : (
            <div className="empty-pane">选择文件后显示元信息</div>
          )}
          {activeTab && (
            <div className="file-actions">
              <button type="button" onClick={copyActivePath}>
                <Copy size={14} />
                复制路径
              </button>
              <button type="button" onClick={revealActiveFile}>
                <LocateFixed size={14} />
                显示文件
              </button>
              <button type="button" onClick={() => openInSystem(activeTab.path)}>
                <FileText size={14} />
                系统打开
              </button>
            </div>
          )}
          {activeEditable && (
            <div className="edit-actions">
              {editing ? (
                <>
                  <button type="button" onClick={saveEditor} disabled={!editorDirty}>保存</button>
                  <button type="button" onClick={cancelEditing}>取消</button>
                </>
              ) : (
                <button type="button" onClick={startEditing}>编辑文本</button>
              )}
            </div>
          )}
          <section className="recent-panel">
            <h3>
              <Clock size={14} />
              最近打开
            </h3>
            {navigation.recent.length > 0 ? navigation.recent.map((tab) => (
              <button key={tab.path} type="button" className={tab.path === activePath ? 'recent-row active' : 'recent-row'} onClick={() => openFilePath(tab.path, tab.name)} title={tab.path}>
                <strong>{tab.name}</strong>
                <span>{viewerById(tab.viewerId).label}</span>
              </button>
            )) : (
              <div className="empty-pane">还没有打开记录</div>
            )}
          </section>
        </aside>
      </section>

      <footer className="statusbar">{message}</footer>
      {commandOpen && (
        <CommandPalette
          onClose={() => setCommandOpen(false)}
          commands={[
            { label: '打开文件夹', run: openWorkspace },
            { label: '打开文件', run: openSingleFile },
            { label: '后退', run: () => navigateHistory('back'), disabled: !backAvailable },
            { label: '前进', run: () => navigateHistory('forward'), disabled: !forwardAvailable },
            { label: '上一文件', run: () => navigateVisibleFile('previous'), disabled: !previousFile },
            { label: '下一文件', run: () => navigateVisibleFile('next'), disabled: !nextFile },
            { label: '刷新工作区', run: refreshWorkspace, disabled: !workspacePath },
            { label: '清除扩展名筛选', run: () => setExtensionFilter(''), disabled: !extensionFilter },
            ...sortModes.map((item) => ({ label: `按${item.label}排序`, run: () => setSortMode(item.mode), disabled: sortMode === item.mode })),
            { label: showHidden ? '隐藏隐藏文件' : '显示隐藏文件', run: () => setShowHidden((value) => !value) },
            { label: '搜索当前查询', run: runContentSearch, disabled: !workspacePath || !contentQuery.trim() },
            { label: editing ? '保存当前编辑' : '编辑当前文本文件', run: editing ? saveEditor : startEditing, disabled: editing ? !editorDirty : !activeEditable },
            { label: '取消当前编辑', run: cancelEditing, disabled: !editing },
            { label: '复制当前文件路径', run: copyActivePath, disabled: !activeTab },
            { label: '在文件管理器中显示当前文件', run: revealActiveFile, disabled: !activeTab },
            { label: '使用系统默认应用打开当前文件', run: () => activeTab ? openInSystem(activeTab.path) : undefined, disabled: !activeTab },
          ]}
        />
      )}
    </main>
  )
}

function searchResultLabel(result: SearchResult): string {
  if (result.matchKind === 'content') return `第 ${result.lineNumber} 行`
  if (result.matchKind === 'office-content') return 'Office 内容'
  if (result.matchKind === 'pdf-content') return 'PDF 内容'
  if (result.matchKind === 'archive-entry') return '压缩包条目'
  return '文件名'
}

function fileNameFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

export default App
