import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const context: Record<string, unknown> = {}
  return {
    context,
    launch: vi.fn(),
    setActiveTab: vi.fn(),
    setActiveTabType: vi.fn()
  }
})

vi.mock('./workspace-action-context', () => ({
  selectWorkspaceActionContext: () => mocks.context
}))
vi.mock('@/lib/launch-agent-background-session', () => ({
  launchAgentBackgroundSession: mocks.launch
}))
vi.mock('@/lib/focus-terminal-tab-surface', () => ({ focusTerminalTabSurface: vi.fn() }))
vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string, values?: Record<string, unknown>) =>
    fallback.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(values?.[name] ?? ''))
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('@/store', () => ({
  useAppStore: {
    getState: () => ({
      settings: {
        sourceControlAi: {
          prCreationDefaults: { draft: true, useTemplate: true },
          instructionsByOperation: { pullRequest: 'Titles use feat(scope):' }
        }
      },
      workspaceStatusRules: {
        actionPrompts: {},
        actionAgents: { reviewPipeline: { agent: 'grok', model: 'grok-4.7', effort: 'high' } },
        reviewInbox: { agent: 'claude' }
      },
      gitConflictOperationByWorktree: {},
      setActiveTab: mocks.setActiveTab,
      setActiveTabType: mocks.setActiveTabType
    })
  }
}))

import { launchWorkspaceAction } from './launch-workspace-action'

function setContext(overrides: Record<string, unknown>): void {
  for (const key of Object.keys(mocks.context)) {
    delete mocks.context[key]
  }
  Object.assign(mocks.context, {
    worktree: { id: 'wt', path: '/w/e-4861', baseRef: 'origin/main' },
    repo: { id: 'r' },
    branch: 'feature/e-4861',
    pr: null,
    unresolvedConflicts: [],
    actions: ['create-pull-request', 'create-draft-pull-request'],
    canReviewBranch: true,
    ...overrides
  })
}

describe('launchWorkspaceAction', () => {
  beforeEach(() => {
    mocks.launch.mockReset().mockResolvedValue({ tabId: 'tab-1' })
  })

  it('creates the pull request with the pull request settings and instructions', async () => {
    setContext({})
    await launchWorkspaceAction('create-pull-request')

    const call = mocks.launch.mock.calls[0]?.[0]
    expect(call).toMatchObject({ agent: 'claude', worktreeId: 'wt', title: 'Create PR' })
    expect(call.prompt).toContain('targeting main')
    expect(call.prompt).toContain('as a draft')
    expect(call.prompt).toContain('Titles use feat(scope):')
    expect(mocks.setActiveTab).toHaveBeenCalledWith('tab-1')
  })

  it('resolves pull request conflicts with the Source Control conflict prompt', async () => {
    setContext({
      actions: ['resolve-conflicts'],
      pr: { number: 3145, state: 'open', baseRefName: 'main', url: '', title: '' }
    })
    await launchWorkspaceAction('resolve-conflicts')
    expect(mocks.launch.mock.calls[0]?.[0].prompt).toContain('Resolve the merge conflicts')
  })

  it('reviews the current branch with the review pipeline', async () => {
    setContext({
      actions: ['review', 're-review'],
      branch: 'feature/scale',
      pr: {
        number: 3145,
        state: 'open',
        baseRefName: 'main',
        url: 'https://x/3145',
        title: 'Scale'
      }
    })
    await launchWorkspaceAction('review')
    const call = mocks.launch.mock.calls[0]?.[0]
    expect(call.title).toBe('Review feature/scale')
    expect(call.prompt).toContain('orca-review skill')
    expect(call.prompt).toContain('review-fe')
    expect(call.agent).toBe('grok')
    expect(call.sessionOptions).toEqual({ model: 'grok-4.7', effort: 'high' })
  })

  it('regroups the branch without reviewing it', async () => {
    setContext({ actions: [], branch: 'feature/scale' })
    await launchWorkspaceAction('regroup')
    const call = mocks.launch.mock.calls[0]?.[0]
    expect(call.title).toBe('Group feature/scale')
    expect(call.agent).toBe('grok')
    expect(call.prompt).toContain('.orca/review-plan.json')
    expect(call.prompt).not.toMatch(/\{\{\w+\}\}/)
  })

  it('reviews a branch that has no pull request', async () => {
    setContext({ actions: [], branch: 'feature/scale' })
    await launchWorkspaceAction('review')
    const call = mocks.launch.mock.calls[0]?.[0]
    expect(call.title).toBe('Review feature/scale')
    expect(call.agent).toBe('grok')
  })

  it('re-reviews the current pull request against the review already left on it', async () => {
    setContext({
      actions: ['review', 're-review'],
      pr: {
        number: 3145,
        state: 'open',
        baseRefName: 'main',
        url: 'https://x/3145',
        title: 'Scale'
      }
    })
    await launchWorkspaceAction('re-review')
    const call = mocks.launch.mock.calls[0]?.[0]
    expect(call.title).toBe('Re-review #3145')
    expect(call.agent).toBe('claude')
    expect(call.sessionOptions).toBeUndefined()
    expect(call.prompt).toContain('Re-review pull request #3145 — "Scale"')
    expect(call.prompt).toContain('orca review comment add')
    expect(call.prompt).not.toMatch(/\{\{\w+\}\}/)
  })

  it('refuses an action the branch no longer offers', async () => {
    setContext({ actions: [], canReviewBranch: false })
    await launchWorkspaceAction('create-pull-request')
    await launchWorkspaceAction('review')
    await launchWorkspaceAction('re-review')
    expect(mocks.launch).not.toHaveBeenCalled()
  })

  it('opens a draft pull request from the draft entry', async () => {
    setContext({})
    await launchWorkspaceAction('create-draft-pull-request')
    const call = mocks.launch.mock.calls[0]?.[0]
    expect(call.title).toBe('Create draft PR')
    expect(call.prompt).toContain('as a draft')
  })
})
