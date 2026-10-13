// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  activeGroupIdByWorktree: { 'wt-1': 'group-a' } as Record<string, string>
}))

vi.mock('../../store', () => ({
  useAppStore: { getState: () => ({ activeGroupIdByWorktree: mocks.activeGroupIdByWorktree }) }
}))

import { requestCloseOtherTabs, subscribeCloseOtherTabs } from './close-other-tabs-request'

describe('close other tabs request', () => {
  function handlers() {
    return { keepActive: vi.fn(), closeAll: vi.fn() }
  }

  it('keeps the active tab of the focused group and empties every other group of the workspace', () => {
    const focused = handlers()
    const split = handlers()
    const elsewhere = handlers()
    const unsubscribers = [
      subscribeCloseOtherTabs('wt-1', 'group-a', focused),
      subscribeCloseOtherTabs('wt-1', 'group-b', split),
      subscribeCloseOtherTabs('wt-2', 'group-a', elsewhere)
    ]

    requestCloseOtherTabs('wt-1')

    expect(focused.keepActive).toHaveBeenCalledOnce()
    expect(focused.closeAll).not.toHaveBeenCalled()
    expect(split.closeAll).toHaveBeenCalledOnce()
    expect(split.keepActive).not.toHaveBeenCalled()
    expect(elsewhere.keepActive).not.toHaveBeenCalled()
    expect(elsewhere.closeAll).not.toHaveBeenCalled()
    for (const unsubscribe of unsubscribers) {
      unsubscribe()
    }
  })

  it('stops listening once unsubscribed', () => {
    const focused = handlers()
    subscribeCloseOtherTabs('wt-1', 'group-a', focused)()

    requestCloseOtherTabs('wt-1')

    expect(focused.keepActive).not.toHaveBeenCalled()
  })
})
