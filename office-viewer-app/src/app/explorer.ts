import type { FileEntry } from '../types'

export type SortMode = 'name' | 'type' | 'size' | 'modified'

export type ExplorerFilter = {
  name: string
  extension: string
}

export function visibleEntries(entries: FileEntry[], filter: ExplorerFilter, sortMode: SortMode): FileEntry[] {
  const filtered = entries.filter((entry) => entryMatchesFilter(entry, filter))
  return [...filtered].sort((first, second) => compareEntries(first, second, sortMode))
}

export function visibleFileSequence(
  rootEntries: FileEntry[],
  childrenByPath: Map<string, FileEntry[]>,
  expanded: Set<string>,
  filter: ExplorerFilter,
  sortMode: SortMode,
): FileEntry[] {
  return visibleEntries(rootEntries, filter, sortMode).flatMap((entry) => fileSequenceForEntry(entry, childrenByPath, expanded, filter, sortMode))
}

export function adjacentVisibleFile(
  rootEntries: FileEntry[],
  childrenByPath: Map<string, FileEntry[]>,
  expanded: Set<string>,
  filter: ExplorerFilter,
  sortMode: SortMode,
  activePath: string,
  direction: 'previous' | 'next',
): FileEntry | undefined {
  const files = visibleFileSequence(rootEntries, childrenByPath, expanded, filter, sortMode)
  const activeIndex = files.findIndex((entry) => entry.path === activePath)
  if (activeIndex < 0) return undefined
  return files[direction === 'previous' ? activeIndex - 1 : activeIndex + 1]
}

function entryMatchesFilter(entry: FileEntry, filter: ExplorerFilter): boolean {
  const nameQuery = filter.name.trim().toLowerCase()
  const extensions = extensionSet(filter.extension)
  if (nameQuery && !entry.name.toLowerCase().includes(nameQuery)) return false
  if (entry.isDir || extensions.size === 0) return true
  return Boolean(entry.extension && extensions.has(entry.extension.toLowerCase()))
}

function extensionSet(value: string): Set<string> {
  return new Set(value.split(/[,\s]+/).map((item) => item.trim().replace(/^\./, '').toLowerCase()).filter(Boolean))
}

function fileSequenceForEntry(
  entry: FileEntry,
  childrenByPath: Map<string, FileEntry[]>,
  expanded: Set<string>,
  filter: ExplorerFilter,
  sortMode: SortMode,
): FileEntry[] {
  if (!entry.isDir) return [entry]
  if (!expanded.has(entry.path)) return []
  return visibleEntries(childrenByPath.get(entry.path) ?? [], filter, sortMode)
    .flatMap((child) => fileSequenceForEntry(child, childrenByPath, expanded, filter, sortMode))
}

function compareEntries(first: FileEntry, second: FileEntry, sortMode: SortMode): number {
  const directoryOrder = Number(second.isDir) - Number(first.isDir)
  if (directoryOrder !== 0) return directoryOrder

  if (sortMode === 'type') {
    return compareText(first.extension ?? '', second.extension ?? '') || compareText(first.name, second.name)
  }

  if (sortMode === 'size') {
    return first.size - second.size || compareText(first.name, second.name)
  }

  if (sortMode === 'modified') {
    return (second.modified ?? 0) - (first.modified ?? 0) || compareText(first.name, second.name)
  }

  return compareText(first.name, second.name)
}

function compareText(first: string, second: string): number {
  return first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' })
}
