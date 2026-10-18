import { beforeEach, describe, expect, it, vi } from 'vitest'

type ArchiveFlowStoreMock = {
  activeWorktreeId: string | null
  setActiveWorktree: ReturnType<typeof vi.fn>
  shutdownWorktreeBrowsers: ReturnType<typeof vi.fn>
  shutdownWorktreeTerminals: ReturnType<typeof vi.fn>
  closeUnifiedTab: ReturnType<typeof vi.fn>
  updateWorktreeMeta: ReturnType<typeof vi.fn>
  allWorktrees: () => { id: string; path: string; hostId: string }[]
  unifiedTabsByWorktree: Record<string, { id: string; contentType: string }[]>
  tabsByWorktree: Record<string, never>
  ptyIdsByTabId: Record<string, never>
}

const mocks = vi.hoisted(() => {
  const state: ArchiveFlowStoreMock = {
    activeWorktreeId: null,
    setActiveWorktree: vi.fn((worktreeId: string | null) => {
      state.activeWorktreeId = worktreeId
    }),
    shutdownWorktreeBrowsers: vi.fn().mockResolvedValue(undefined),
    shutdownWorktreeTerminals: vi.fn().mockResolvedValue(undefined),
    closeUnifiedTab: vi.fn(),
    updateWorktreeMeta: vi.fn().mockResolvedValue({ ok: true }),
    allWorktrees: () => [
      { id: 'wt-1', path: '/checkouts/wt-1', hostId: 'local' },
      { id: 'wt-2', path: '/checkouts/wt-2', hostId: 'ssh-box' }
    ],
    unifiedTabsByWorktree: {},
    tabsByWorktree: {},
    ptyIdsByTabId: {}
  }
  return {
    state,
    stopWorktree: vi.fn().mockResolvedValue(undefined),
    suspendWorkspace: vi.fn().mockResolvedValue(null),
    toastError: vi.fn()
  }
})

vi.mock('@/store', () => ({ useAppStore: { getState: () => mocks.state } }))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }))
vi.mock('@/lib/worktree-sleep-intent', () => ({
  clearWorktreeSleepIntent: vi.fn(),
  markWorktreeSleepIntent: vi.fn(),
  withWorktreeSleepTeardown: (_worktreeId: string, teardown: () => Promise<unknown>) => teardown()
}))

import { runArchiveWorktrees, runUnarchiveWorktrees } from './archive-worktree-flow'

describe('runArchiveWorktrees', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal('window', {
      api: {
        ephemeralVm: { suspendWorkspace: mocks.suspendWorkspace },
        languageServer: { stopWorktree: mocks.stopWorktree }
      },
      requestAnimationFrame: vi.fn()
    })
    mocks.state.activeWorktreeId = null
    mocks.state.unifiedTabsByWorktree = {}
    mocks.state.setActiveWorktree.mockClear()
    mocks.state.shutdownWorktreeBrowsers.mockClear().mockResolvedValue(undefined)
    mocks.state.shutdownWorktreeTerminals.mockClear().mockResolvedValue(undefined)
    mocks.state.closeUnifiedTab.mockClear()
    mocks.state.updateWorktreeMeta.mockClear().mockResolvedValue({ ok: true })
    mocks.stopWorktree.mockClear().mockResolvedValue(undefined)
    mocks.suspendWorkspace.mockClear().mockResolvedValue(null)
    mocks.toastError.mockClear()
  })

  it('tears the workspace down and only then persists the flag, host-qualified', async () => {
    await runArchiveWorktrees(['wt-2'])

    expect(mocks.state.shutdownWorktreeBrowsers).toHaveBeenCalledWith('wt-2')
    expect(mocks.state.shutdownWorktreeTerminals).toHaveBeenCalledWith('wt-2', {
      keepIdentifiers: true
    })
    expect(mocks.state.updateWorktreeMeta).toHaveBeenCalledWith(
      'wt-2',
      { isArchived: true },
      { executionHostId: 'ssh-box' }
    )
    const terminals = mocks.state.shutdownWorktreeTerminals.mock.invocationCallOrder[0]
    const flag = mocks.state.updateWorktreeMeta.mock.invocationCallOrder[0]
    expect(terminals).toBeLessThan(flag)
  })

  it('releases the work sleep leaves running: structured sessions and language servers', async () => {
    mocks.state.unifiedTabsByWorktree = {
      'wt-1': [
        { id: 'tab-chat', contentType: 'agent-session' },
        { id: 'tab-editor', contentType: 'editor' }
      ]
    }

    await runArchiveWorktrees(['wt-1'])

    expect(mocks.state.closeUnifiedTab).toHaveBeenCalledWith('tab-chat', {
      preserveWorktreeSelection: true,
      recordInteraction: false
    })
    expect(mocks.state.closeUnifiedTab).not.toHaveBeenCalledWith('tab-editor', expect.anything())
    expect(mocks.stopWorktree).toHaveBeenCalledWith({ worktreeRoot: '/checkouts/wt-1' })
  })

  it('leaves a workspace whose teardown failed visible and unflagged', async () => {
    mocks.state.shutdownWorktreeTerminals.mockRejectedValueOnce(new Error('terminal_stop_refused'))

    await runArchiveWorktrees(['wt-1'])

    expect(mocks.state.updateWorktreeMeta).not.toHaveBeenCalled()
    expect(mocks.toastError).toHaveBeenCalled()
  })

  it('archives the workspaces that succeeded in a mixed batch', async () => {
    mocks.state.shutdownWorktreeBrowsers.mockRejectedValueOnce(new Error('runtime gone'))

    await runArchiveWorktrees(['wt-1', 'wt-2'])

    expect(mocks.state.updateWorktreeMeta).toHaveBeenCalledTimes(1)
    expect(mocks.state.updateWorktreeMeta).toHaveBeenCalledWith(
      'wt-2',
      { isArchived: true },
      { executionHostId: 'ssh-box' }
    )
  })
})

describe('runUnarchiveWorktrees', () => {
  beforeEach(() => {
    mocks.state.updateWorktreeMeta.mockClear().mockResolvedValue({ ok: true })
    mocks.state.shutdownWorktreeTerminals.mockClear().mockResolvedValue(undefined)
  })

  it('uses the host the caller named when the same id exists twice', async () => {
    await runUnarchiveWorktrees(['wt-1'], { 'wt-1': 'ssh:box' })

    expect(mocks.state.updateWorktreeMeta).toHaveBeenCalledWith(
      'wt-1',
      { isArchived: false },
      { executionHostId: 'ssh:box' }
    )
  })

  it('clears the flag without touching the runtime', async () => {
    await runUnarchiveWorktrees(['wt-1'])

    expect(mocks.state.updateWorktreeMeta).toHaveBeenCalledWith(
      'wt-1',
      { isArchived: false },
      { executionHostId: 'local' }
    )
    expect(mocks.state.shutdownWorktreeTerminals).not.toHaveBeenCalled()
  })
})
