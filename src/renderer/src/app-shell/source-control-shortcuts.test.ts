import { describe, expect, it, vi } from 'vitest'
import { isUncommittedOnly } from '@/lib/changes-filter'
import { publishPRCommentQueueContext } from '@/components/right-sidebar/pr-comment-queue-context'
import { setPRCommentsListGroupQueued } from '@/components/right-sidebar/pr-comments-list-selection'
import { consumeSendQueuedPRCommentsRequest } from '@/components/right-sidebar/queued-pr-comments-send'
import { takeSourceControlShortcut } from './source-control-shortcuts'

const store = vi.hoisted(() => ({
  activeWorktreeId: 'wt-shortcut',
  setRightSidebarOpen: vi.fn(),
  setRightSidebarTab: vi.fn()
}))

vi.mock('../store', () => ({
  useAppStore: { getState: () => store }
}))

vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn() } }))

const actions = { openDiffNotesSendMenuForActiveWorktree: () => false }

describe('takeSourceControlShortcut', () => {
  it('toggles the uncommitted-only Changes filter for the active workspace', () => {
    const match = (id: string): boolean => id === 'sourceControl.toggleUncommittedOnly'
    expect(takeSourceControlShortcut(match, true, actions)).toBe(
      'sourceControl.toggleUncommittedOnly'
    )
    expect(isUncommittedOnly('wt-shortcut')).toBe(true)
    takeSourceControlShortcut(match, true, actions)
    expect(isUncommittedOnly('wt-shortcut')).toBe(false)
  })

  it('opens the PR panel to send the queued comments from any panel', () => {
    publishPRCommentQueueContext('wt-shortcut', 'shortcut-key')
    setPRCommentsListGroupQueued('shortcut-key', 'thread:T1', true)
    const match = (id: string): boolean => id === 'sourceControl.sendQueuedComments'
    expect(takeSourceControlShortcut(match, true, actions)).toBe('sourceControl.sendQueuedComments')
    expect(store.setRightSidebarOpen).toHaveBeenCalledWith(true)
    expect(store.setRightSidebarTab).toHaveBeenCalledWith('checks')
    expect(consumeSendQueuedPRCommentsRequest('wt-shortcut')).toBe(true)
  })
})
