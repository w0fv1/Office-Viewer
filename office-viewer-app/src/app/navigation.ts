import type { OpenTab } from '../types'

export type NavigationState = {
  history: string[]
  index: number
  recent: OpenTab[]
}

export const emptyNavigation: NavigationState = {
  history: [],
  index: -1,
  recent: [],
}

export function recordOpen(state: NavigationState, tab: OpenTab, limit = 20): NavigationState {
  const current = state.history[state.index]
  const historyBase = state.index >= 0 ? state.history.slice(0, state.index + 1) : []
  const history = current === tab.path ? historyBase : [...historyBase, tab.path]
  return {
    history,
    index: history.length - 1,
    recent: [tab, ...state.recent.filter((item) => item.path !== tab.path)].slice(0, limit),
  }
}

export function canGoBack(state: NavigationState): boolean {
  return state.index > 0
}

export function canGoForward(state: NavigationState): boolean {
  return state.index >= 0 && state.index < state.history.length - 1
}

export function goBack(state: NavigationState): NavigationState {
  if (!canGoBack(state)) return state
  return { ...state, index: state.index - 1 }
}

export function goForward(state: NavigationState): NavigationState {
  if (!canGoForward(state)) return state
  return { ...state, index: state.index + 1 }
}

export function activeHistoryPath(state: NavigationState): string {
  return state.history[state.index] ?? ''
}
