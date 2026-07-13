import { describe, expect, it } from 'vitest'
import type { OpenTab } from '../types'
import { activeHistoryPath, emptyNavigation, goBack, goForward, recordOpen } from './navigation'

const tab = (path: string): OpenTab => ({
  path,
  name: path.split('/').at(-1) ?? path,
  viewerId: 'text',
})

describe('navigation history', () => {
  it('records opened files and moves backward and forward', () => {
    const first = recordOpen(emptyNavigation, tab('/workspace/a.txt'))
    const second = recordOpen(first, tab('/workspace/b.txt'))
    const back = goBack(second)
    const forward = goForward(back)

    expect(activeHistoryPath(second)).toBe('/workspace/b.txt')
    expect(activeHistoryPath(back)).toBe('/workspace/a.txt')
    expect(activeHistoryPath(forward)).toBe('/workspace/b.txt')
  })

  it('drops forward history when opening a new file after going back', () => {
    const state = recordOpen(recordOpen(recordOpen(emptyNavigation, tab('/a.txt')), tab('/b.txt')), tab('/c.txt'))
    const branched = recordOpen(goBack(state), tab('/d.txt'))

    expect(branched.history).toEqual(['/a.txt', '/b.txt', '/d.txt'])
    expect(activeHistoryPath(branched)).toBe('/d.txt')
  })

  it('keeps recent files unique with the latest file first', () => {
    const state = recordOpen(recordOpen(recordOpen(emptyNavigation, tab('/a.txt')), tab('/b.txt')), tab('/a.txt'))

    expect(state.recent.map((item) => item.path)).toEqual(['/a.txt', '/b.txt'])
  })
})
