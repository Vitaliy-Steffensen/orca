import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { AppShortcutState, ShortcutDispatchInput } from './app-command-handlers'
import type { OpenFile } from '../store/slices/editor'
import type { GitStatusEntry } from '../../../shared/git-status-types'
import type { GitBranchChangeEntry } from '../../../shared/git-diff-compare-types'

const mocks = vi.hoisted(() => {
  const store: {
    activeFileId: string | null
    activeWorktreeId: string | null
    openFiles: OpenFile[]
    rightSidebarOpen: boolean
    rightSidebarTab: string
    rightSidebarTabByWorktree: Record<string, string>
    gitStatusByWorktree: Record<string, GitStatusEntry[]>
    gitBranchChangesByWorktree: Record<string, GitBranchChangeEntry[]>
    revealInExplorer: Mock
    setRightSidebarOpen: Mock
    setRightSidebarTab: Mock
  } = {
    activeFileId: 'file-1',
    activeWorktreeId: 'wt-1',
    openFiles: [],
    rightSidebarOpen: true,
    rightSidebarTab: 'explorer',
    rightSidebarTabByWorktree: {},
    gitStatusByWorktree: {},
    gitBranchChangesByWorktree: {},
    revealInExplorer: vi.fn(),
    setRightSidebarOpen: vi.fn(),
    setRightSidebarTab: vi.fn()
  }
  return {
    requestCombinedDiffTreeReveal: vi.fn(),
    requestSourceControlRowReveal: vi.fn(),
    notifyTerminalCapture: vi.fn(),
    store
  }
})

vi.mock('../store', () => ({
  useAppStore: Object.assign(vi.fn(), { getState: () => mocks.store })
}))

vi.mock('@/lib/combined-diff-tree-reveal-request', () => ({
  requestCombinedDiffTreeReveal: mocks.requestCombinedDiffTreeReveal
}))

vi.mock('@/lib/source-control-row-reveal', () => ({
  requestSourceControlRowReveal: mocks.requestSourceControlRowReveal
}))

vi.mock('@/lib/floating-workspace-terminal-actions', () => ({
  isFloatingWorkspacePanelFocused: () => false
}))

vi.mock('@/lib/visible-overlay', () => ({ hasVisibleOverlay: () => false }))

vi.mock('@/lib/terminal-shortcut-capture-notification', () => ({
  showTerminalShortcutCaptureNotification: mocks.notifyTerminalCapture
}))

import { createAppCommandHandlers } from './app-command-handlers'

function openFile(overrides: Partial<OpenFile>): OpenFile {
  return {
    id: 'file-1',
    filePath: '/wt/src/deep/thing.ts',
    relativePath: 'src/deep/thing.ts',
    worktreeId: 'wt-1',
    language: 'typescript',
    mode: 'edit',
    isDirty: false,
    ...overrides
  }
}

function shortcutState(): AppShortcutState {
  return {
    activeView: 'terminal',
    activeWorktreeId: 'wt-1',
    actions: {
      toggleSidebar: vi.fn(),
      toggleRightSidebar: vi.fn(),
      setRightSidebarOpen: vi.fn(),
      setRightSidebarTab: vi.fn(),
      showRightSidebarFiles: vi.fn(),
      showRightSidebarSearch: vi.fn(),
      openDiffNotesSendMenuForActiveWorktree: vi.fn()
    },
    creationLayoutActive: false,
    floatingTerminalEnabled: false,
    floatingTerminalOpen: false,
    floatingVisibleTabCount: 0,
    keybindings: {},
    openFloatingWorkspaceMaximized: vi.fn(),
    pluginCommands: [],
    setFloatingTerminalOpen: vi.fn(),
    terminalShortcutPolicy: 'orca-first',
    workspaceChromeActive: true
  }
}

function shortcutInput(): ShortcutDispatchInput {
  return { target: null, defaultPrevented: false, preventDefault: vi.fn() }
}

function runReveal(input: ShortcutDispatchInput): boolean | undefined {
  return createAppCommandHandlers(shortcutState(), input).get('view.revealActiveFile')?.()
}

describe('reveal active file app command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.store.activeFileId = 'file-1'
    mocks.store.activeWorktreeId = 'wt-1'
    mocks.store.openFiles = []
    mocks.store.rightSidebarOpen = true
    mocks.store.rightSidebarTab = 'explorer'
    mocks.store.rightSidebarTabByWorktree = {}
    mocks.store.gitStatusByWorktree = {}
    mocks.store.gitBranchChangesByWorktree = {}
  })

  it('reveals an edit tab in the explorer', () => {
    mocks.store.openFiles = [openFile({})]
    const input = shortcutInput()

    expect(runReveal(input)).toBe(true)
    expect(input.preventDefault).toHaveBeenCalledOnce()
    expect(mocks.store.revealInExplorer).toHaveBeenCalledWith('wt-1', '/wt/src/deep/thing.ts')
    expect(mocks.requestCombinedDiffTreeReveal).not.toHaveBeenCalled()
  })

  it('reveals a markdown preview tab by its source file', () => {
    mocks.store.openFiles = [openFile({ mode: 'markdown-preview', filePath: '/wt/docs/readme.md' })]

    expect(runReveal(shortcutInput())).toBe(true)
    expect(mocks.store.revealInExplorer).toHaveBeenCalledWith('wt-1', '/wt/docs/readme.md')
  })

  it('reveals a single-file diff tab in the explorer', () => {
    mocks.store.openFiles = [openFile({ mode: 'diff', diffSource: 'unstaged' })]

    expect(runReveal(shortcutInput())).toBe(true)
    expect(mocks.store.revealInExplorer).toHaveBeenCalledWith('wt-1', '/wt/src/deep/thing.ts')
  })

  it('asks the combined diff viewer instead, since its path is the worktree root', () => {
    mocks.store.openFiles = [
      openFile({ mode: 'diff', diffSource: 'combined-all', filePath: '/wt' })
    ]

    expect(runReveal(shortcutInput())).toBe(true)
    expect(mocks.requestCombinedDiffTreeReveal).toHaveBeenCalledWith('file-1')
    expect(mocks.store.revealInExplorer).not.toHaveBeenCalled()
  })

  it('leaves the chord unclaimed on a tab with no file behind it', () => {
    mocks.store.openFiles = [openFile({ mode: 'chat-visual' })]
    const input = shortcutInput()

    expect(runReveal(input)).toBe(false)
    expect(input.preventDefault).not.toHaveBeenCalled()
    expect(mocks.store.revealInExplorer).not.toHaveBeenCalled()
  })

  it('leaves the chord unclaimed when the active tab belongs to another worktree', () => {
    mocks.store.openFiles = [openFile({ worktreeId: 'wt-2' })]

    expect(runReveal(shortcutInput())).toBe(false)
    expect(mocks.store.revealInExplorer).not.toHaveBeenCalled()
  })

  it('leaves the chord unclaimed when no editor tab is active', () => {
    mocks.store.activeFileId = null

    expect(runReveal(shortcutInput())).toBe(false)
    expect(mocks.store.revealInExplorer).not.toHaveBeenCalled()
  })

  it('highlights the file in Source Control when that tab is the one open', () => {
    mocks.store.rightSidebarTab = 'source-control'
    mocks.store.gitStatusByWorktree = {
      'wt-1': [{ path: 'src/deep/thing.ts', status: 'modified', area: 'unstaged' }]
    }
    mocks.store.openFiles = [openFile({ mode: 'diff', diffSource: 'unstaged' })]

    expect(runReveal(shortcutInput())).toBe(true)
    expect(mocks.requestSourceControlRowReveal).toHaveBeenCalledWith(
      'wt-1',
      'unstaged::src/deep/thing.ts'
    )
    expect(mocks.store.setRightSidebarTab).toHaveBeenCalledWith('source-control')
    expect(mocks.store.revealInExplorer).not.toHaveBeenCalled()
  })

  it('resolves a plain edit tab to its staged row when that is the only one', () => {
    mocks.store.rightSidebarTab = 'source-control'
    mocks.store.gitStatusByWorktree = {
      'wt-1': [{ path: 'src/deep/thing.ts', status: 'modified', area: 'staged' }]
    }
    mocks.store.openFiles = [openFile({})]

    expect(runReveal(shortcutInput())).toBe(true)
    expect(mocks.requestSourceControlRowReveal).toHaveBeenCalledWith(
      'wt-1',
      'staged::src/deep/thing.ts'
    )
  })

  it('falls back to the explorer when Source Control has no row for the file', () => {
    mocks.store.rightSidebarTab = 'source-control'
    mocks.store.openFiles = [openFile({})]

    expect(runReveal(shortcutInput())).toBe(true)
    expect(mocks.requestSourceControlRowReveal).not.toHaveBeenCalled()
    expect(mocks.store.revealInExplorer).toHaveBeenCalledWith('wt-1', '/wt/src/deep/thing.ts')
  })

  it('stays in the explorer tree when that is the tab open, even for a changed file', () => {
    mocks.store.gitStatusByWorktree = {
      'wt-1': [{ path: 'src/deep/thing.ts', status: 'modified', area: 'unstaged' }]
    }
    mocks.store.openFiles = [openFile({ mode: 'diff', diffSource: 'unstaged' })]

    expect(runReveal(shortcutInput())).toBe(true)
    expect(mocks.store.revealInExplorer).toHaveBeenCalledWith('wt-1', '/wt/src/deep/thing.ts')
    expect(mocks.requestSourceControlRowReveal).not.toHaveBeenCalled()
  })

  it('reopens a shut sidebar on the tab that worktree last used', () => {
    mocks.store.rightSidebarOpen = false
    mocks.store.rightSidebarTab = 'explorer'
    mocks.store.rightSidebarTabByWorktree = { 'wt-1': 'source-control' }
    mocks.store.gitStatusByWorktree = {
      'wt-1': [{ path: 'src/deep/thing.ts', status: 'modified', area: 'unstaged' }]
    }
    mocks.store.openFiles = [openFile({})]

    expect(runReveal(shortcutInput())).toBe(true)
    expect(mocks.store.setRightSidebarOpen).toHaveBeenCalledWith(true)
    expect(mocks.requestSourceControlRowReveal).toHaveBeenCalledWith(
      'wt-1',
      'unstaged::src/deep/thing.ts'
    )
  })

  it('prefers the branch row for a branch diff tab over the working-tree row', () => {
    mocks.store.rightSidebarTab = 'source-control'
    mocks.store.gitStatusByWorktree = {
      'wt-1': [{ path: 'src/deep/thing.ts', status: 'modified', area: 'unstaged' }]
    }
    mocks.store.gitBranchChangesByWorktree = {
      'wt-1': [{ path: 'src/deep/thing.ts', status: 'modified' }]
    }
    mocks.store.openFiles = [openFile({ mode: 'diff', diffSource: 'branch' })]

    expect(runReveal(shortcutInput())).toBe(true)
    expect(mocks.requestSourceControlRowReveal).toHaveBeenCalledWith(
      'wt-1',
      'branch::src/deep/thing.ts'
    )
  })
})
