import { describe, expect, it } from 'vitest'

import {
  getSidebarOrderedWorkspaceStatusHeaderIdsByBucket,
  getWorkspaceStatusHeaderDragBucketKey,
  getWorkspaceStatusHeaderOrderForSidebarDrop,
  WORKSPACE_STATUS_SECTION_BUCKET
} from './workspace-status-header-drop'
import type { Row } from './worktree-list/grouping/row-types'

function header(key: string, overrides: Partial<Row> = {}): Row {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the bucket readers touch only type, key, statusSection and parentKey.
  return { type: 'header', key, label: key, count: 0, tone: '', ...overrides } as Row
}

describe('getWorkspaceStatusHeaderDragBucketKey', () => {
  it('puts every band in one bucket and every lane in its own band', () => {
    expect(
      getWorkspaceStatusHeaderDragBucketKey({ type: 'header', statusSection: 'Needs me' })
    ).toBe(WORKSPACE_STATUS_SECTION_BUCKET)
    expect(
      getWorkspaceStatusHeaderDragBucketKey({ type: 'header', parentKey: 'band:needs-me' })
    ).toBe('band:needs-me')
  })

  it('leaves a header that belongs to no band out of every bucket', () => {
    expect(getWorkspaceStatusHeaderDragBucketKey({ type: 'header' })).toBeNull()
    expect(getWorkspaceStatusHeaderDragBucketKey({ type: 'item' })).toBeNull()
  })
})

describe('getSidebarOrderedWorkspaceStatusHeaderIdsByBucket', () => {
  it('never lets two bands share a lane bucket', () => {
    const buckets = getSidebarOrderedWorkspaceStatusHeaderIdsByBucket([
      header('band:a', { statusSection: 'A' }),
      header('lane:a1', { parentKey: 'band:a' }),
      header('lane:a2', { parentKey: 'band:a' }),
      header('band:b', { statusSection: 'B' }),
      header('lane:b1', { parentKey: 'band:b' })
    ])

    expect(buckets.get(WORKSPACE_STATUS_SECTION_BUCKET)).toEqual(['band:a', 'band:b'])
    expect(buckets.get('band:a')).toEqual(['lane:a1', 'lane:a2'])
    expect(buckets.get('band:b')).toEqual(['lane:b1'])
  })
})

describe('getWorkspaceStatusHeaderOrderForSidebarDrop', () => {
  const keys = ['a', 'b', 'c']

  it('lifts a header to the top', () => {
    expect(
      getWorkspaceStatusHeaderOrderForSidebarDrop({
        sidebarHeaderKeys: keys,
        draggedHeaderKey: 'c',
        sidebarDropIndex: 0
      })
    ).toEqual(['c', 'a', 'b'])
  })

  it('drops a header at the end', () => {
    expect(
      getWorkspaceStatusHeaderOrderForSidebarDrop({
        sidebarHeaderKeys: keys,
        draggedHeaderKey: 'a',
        sidebarDropIndex: 3
      })
    ).toEqual(['b', 'c', 'a'])
  })

  it('commits nothing when the header lands where it started', () => {
    expect(
      getWorkspaceStatusHeaderOrderForSidebarDrop({
        sidebarHeaderKeys: keys,
        draggedHeaderKey: 'b',
        sidebarDropIndex: 1
      })
    ).toBeNull()
    expect(
      getWorkspaceStatusHeaderOrderForSidebarDrop({
        sidebarHeaderKeys: keys,
        draggedHeaderKey: 'b',
        sidebarDropIndex: 2
      })
    ).toBeNull()
  })

  it('ignores a header that is not in the bucket', () => {
    expect(
      getWorkspaceStatusHeaderOrderForSidebarDrop({
        sidebarHeaderKeys: keys,
        draggedHeaderKey: 'z',
        sidebarDropIndex: 0
      })
    ).toBeNull()
  })
})
