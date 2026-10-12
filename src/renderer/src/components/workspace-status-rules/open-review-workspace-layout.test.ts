import { describe, expect, it, vi } from 'vitest'
import { openReviewWorkspaceLayout } from './open-review-workspace-layout'

const SUMMARY = {
  baseRef: 'origin/main',
  baseOid: 'base',
  compareRef: 'feature',
  headOid: 'head',
  mergeBase: 'base',
  changedFiles: 2,
  status: 'ready' as const
}

const TARGET = {
  worktreeId: 'wt-1',
  worktreePath: '/work/review',
  agentTabId: 'agent-tab',
  baseRef: 'origin/main'
}

function fakeStore() {
  return {
    settings: null,
    unifiedTabsByWorktree: { 'wt-1': [{ id: 'agent-tab', groupId: 'group-left' }] },
    ensureWorktreeRootGroup: vi.fn(() => 'group-root'),
    createEmptySplitGroup: vi.fn(() => 'group-right'),
    beginGitBranchCompareRequest: vi.fn(),
    setGitBranchCompareResult: vi.fn(),
    openBranchWorktreeDiff: vi.fn(),
    activateTab: vi.fn()
  }
}

const AGENT_TAB_SELECTED = ['agent-tab', { worktreeId: 'wt-1', recordFocus: false }]

describe('openReviewWorkspaceLayout', () => {
  it("opens the PR's first file beside the review agent, split to its right", async () => {
    const store = fakeStore()
    const branchCompare = vi.fn(async () => ({
      summary: SUMMARY,
      entries: [
        { path: 'src/z.ts', status: 'modified' as const },
        { path: 'src/a.ts', status: 'added' as const }
      ]
    }))

    await openReviewWorkspaceLayout(TARGET, { getState: () => store as never, branchCompare })

    expect(branchCompare).toHaveBeenCalledWith(
      expect.objectContaining({ worktreeId: 'wt-1', worktreePath: '/work/review' }),
      'origin/main',
      'background'
    )
    expect(store.setGitBranchCompareResult).toHaveBeenCalled()
    expect(store.createEmptySplitGroup).toHaveBeenCalledWith('wt-1', 'group-left', 'right', {
      activate: false
    })
    expect(store.openBranchWorktreeDiff).toHaveBeenCalledWith(
      'wt-1',
      '/work/review',
      { path: 'src/a.ts', status: 'added' },
      SUMMARY,
      'typescript',
      { targetGroupId: 'group-right', preview: false }
    )
    // The setup and default tabs open in the agent's group too; the agent is the one shown there.
    expect(store.activateTab).toHaveBeenLastCalledWith(...AGENT_TAB_SELECTED)
    expect(store.activateTab.mock.invocationCallOrder[0]).toBeGreaterThan(
      store.openBranchWorktreeDiff.mock.invocationCallOrder[0]
    )
  })

  it('still shows the agent, on its own, when the PR has no changed files or the compare fails', async () => {
    const store = fakeStore()
    await openReviewWorkspaceLayout(TARGET, {
      getState: () => store as never,
      branchCompare: async () => ({ summary: SUMMARY, entries: [] })
    })
    await openReviewWorkspaceLayout(TARGET, {
      getState: () => store as never,
      branchCompare: async () => {
        throw new Error('no base')
      }
    })
    expect(store.createEmptySplitGroup).not.toHaveBeenCalled()
    expect(store.openBranchWorktreeDiff).not.toHaveBeenCalled()
    expect(store.activateTab).toHaveBeenCalledTimes(2)
    expect(store.activateTab).toHaveBeenLastCalledWith(...AGENT_TAB_SELECTED)
  })
})
