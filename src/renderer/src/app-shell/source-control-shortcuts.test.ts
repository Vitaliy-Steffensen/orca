import { describe, expect, it, vi } from 'vitest'
import { isUncommittedOnly } from '@/lib/changes-filter'
import { publishPRCommentQueueContext } from '@/components/right-sidebar/pr-comment-queue-context'
import { setPRCommentsListGroupQueued } from '@/components/right-sidebar/pr-comments-list-selection'
import { consumeSendQueuedPRCommentsRequest } from '@/components/right-sidebar/queued-pr-comments-send'
import {
  consumeReviewSummaryFocusRequest,
  registerReviewSummary
} from '@/components/pending-review/review-summary-focus'
import { takeSourceControlShortcut } from './source-control-shortcuts'

const store = vi.hoisted(() => ({
  activeWorktreeId: 'wt-shortcut',
  rightSidebarOpen: true,
  rightSidebarTab: 'source-control',
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

  describe('focus review summary', () => {
    const match = (id: string): boolean => id === 'sourceControl.focusReviewSummary'

    it('asks the open Source Control panel to focus its review summary', () => {
      const unregister = registerReviewSummary('wt-shortcut')
      expect(takeSourceControlShortcut(match, true, actions)).toBe(
        'sourceControl.focusReviewSummary'
      )
      expect(consumeReviewSummaryFocusRequest('wt-shortcut')).toBe(true)
      unregister()
    })

    it('leaves the chord alone when the Source Control panel is not showing', () => {
      const unregister = registerReviewSummary('wt-shortcut')
      store.rightSidebarTab = 'checks'
      expect(takeSourceControlShortcut(match, true, actions)).toBeNull()
      store.rightSidebarTab = 'source-control'
      store.rightSidebarOpen = false
      expect(takeSourceControlShortcut(match, true, actions)).toBeNull()
      store.rightSidebarOpen = true
      expect(consumeReviewSummaryFocusRequest('wt-shortcut')).toBe(false)
      unregister()
    })

    it('leaves the chord alone when the panel has no Review section', () => {
      expect(takeSourceControlShortcut(match, true, actions)).toBeNull()
      expect(consumeReviewSummaryFocusRequest('wt-shortcut')).toBe(false)
    })
  })
})
