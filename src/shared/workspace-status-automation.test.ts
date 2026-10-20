import { describe, expect, it } from 'vitest'
import {
  getLockedWorkspaceStatuses,
  getManualWorkspaceStatuses,
  isAutoPullWorkspaceStatus,
  isHeldByAutomation,
  isLockedWorkspaceStatus
} from './workspace-status-automation'
import { normalizeWorkspaceStatuses } from './workspace-statuses'
import type { WorkspaceStatusDefinition } from './worktree/types'

const STATUSES: WorkspaceStatusDefinition[] = [
  { id: 'implementing', label: 'Implementing' },
  {
    id: 'reviewing-others',
    label: 'Reviewing others',
    locked: true,
    autoFilled: true,
    autoPull: true
  },
  { id: 'automation', label: 'Automation', locked: true, autoFilled: true, holdsAutomation: true }
]

describe('workspace status automation flags', () => {
  it('splits the picker into what the user may choose and what automation owns', () => {
    expect(getManualWorkspaceStatuses(STATUSES).map((status) => status.id)).toEqual([
      'implementing'
    ])
    expect(getLockedWorkspaceStatuses(STATUSES).map((status) => status.id)).toEqual([
      'reviewing-others',
      'automation'
    ])
  })

  it('reads each flag off the lane it was set on', () => {
    expect(isLockedWorkspaceStatus(STATUSES, 'implementing')).toBe(false)
    expect(isLockedWorkspaceStatus(STATUSES, 'automation')).toBe(true)
    expect(isAutoPullWorkspaceStatus(STATUSES, 'reviewing-others')).toBe(true)
    expect(isAutoPullWorkspaceStatus(STATUSES, 'automation')).toBe(false)
  })

  it('treats an unknown lane as carrying no flags', () => {
    expect(isLockedWorkspaceStatus(STATUSES, 'deleted-lane')).toBe(false)
    expect(isAutoPullWorkspaceStatus(STATUSES, null)).toBe(false)
  })

  it('holds only a busy workspace, and only in a holding lane', () => {
    expect(isHeldByAutomation(STATUSES, 'automation', true)).toBe(true)
    expect(isHeldByAutomation(STATUSES, 'automation', false)).toBe(false)
    expect(isHeldByAutomation(STATUSES, 'reviewing-others', true)).toBe(false)
  })
})

describe('normalizeWorkspaceStatuses', () => {
  it('keeps the flags that were set and leaves the rest absent', () => {
    const [lane] = normalizeWorkspaceStatuses([
      { id: 'automation', label: 'Automation', locked: true, holdsAutomation: true }
    ])
    expect(lane?.locked).toBe(true)
    expect(lane?.holdsAutomation).toBe(true)
    expect('autoPull' in (lane ?? {})).toBe(false)
    expect('autoFilled' in (lane ?? {})).toBe(false)
  })

  it('drops a flag that is not literally true, so a stray string cannot lock a lane', () => {
    const [lane] = normalizeWorkspaceStatuses([
      { id: 'implementing', label: 'Implementing', locked: 'yes' }
    ])
    expect('locked' in (lane ?? {})).toBe(false)
  })
})
