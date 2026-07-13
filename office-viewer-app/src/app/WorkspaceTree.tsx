import { FileText, Folder, FolderOpen } from 'lucide-react'
import type { FileEntry } from '../types'
import { visibleEntries, type ExplorerFilter, type SortMode } from './explorer'

export type WorkspaceTreeProps = {
  entry: FileEntry
  depth: number
  activePath?: string
  childrenByPath: Map<string, FileEntry[]>
  expanded: Set<string>
  filter: ExplorerFilter
  sortMode: SortMode
  onToggle: (entry: FileEntry) => void
  onOpen: (entry: FileEntry) => void
}

export function WorkspaceTree(props: WorkspaceTreeProps) {
  const { entry, depth, activePath, childrenByPath, expanded, filter, sortMode, onToggle, onOpen } = props
  const isExpanded = expanded.has(entry.path)
  const visibleChildren = visibleEntries(childrenByPath.get(entry.path) ?? [], filter, sortMode)

  return (
    <div>
      <button
        type="button"
        className={entry.path === activePath ? 'tree-row active' : 'tree-row'}
        style={{ paddingLeft: 10 + depth * 16 }}
        onClick={() => entry.isDir ? onToggle(entry) : onOpen(entry)}
        title={entry.path}
      >
        {entry.isDir ? (isExpanded ? <FolderOpen size={15} /> : <Folder size={15} />) : <FileText size={15} />}
        <span>{entry.name}</span>
        {!entry.isDir && <em>{entry.extension}</em>}
      </button>
      {entry.isDir && isExpanded && visibleChildren.map((child) => (
        <WorkspaceTree
          key={child.path}
          entry={child}
          depth={depth + 1}
          activePath={activePath}
          childrenByPath={childrenByPath}
          expanded={expanded}
          filter={filter}
          sortMode={sortMode}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}
