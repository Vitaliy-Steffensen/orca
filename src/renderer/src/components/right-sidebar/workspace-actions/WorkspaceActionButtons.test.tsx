// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { WorkspaceActionKind } from '../../../../../shared/workspace-action'

type ActionContextStub = { actions: WorkspaceActionKind[]; canReviewBranch: boolean }

const mocks = vi.hoisted(() => {
  const state: ActionContextStub = { actions: [], canReviewBranch: false }
  return { state, launch: vi.fn() }
})

vi.mock('zustand/react/shallow', () => ({ useShallow: (fn: unknown) => fn }))
vi.mock('@/store', () => ({
  useAppStore: (selector: (state: ActionContextStub) => unknown) => selector(mocks.state)
}))
vi.mock('./workspace-action-context', () => ({
  selectWorkspaceActionContext: (state: ActionContextStub) => state
}))
vi.mock('./launch-workspace-action', () => ({ launchWorkspaceAction: mocks.launch }))
vi.mock('@/i18n/i18n', () => ({ translate: (_key: string, fallback: string) => fallback }))

import { WorkspaceActionButtons } from './WorkspaceActionButtons'

function renderWith(actions: WorkspaceActionKind[], canReviewBranch = false): void {
  mocks.state.actions = actions
  mocks.state.canReviewBranch = canReviewBranch
  mocks.launch.mockReset().mockResolvedValue(undefined)
  render(<WorkspaceActionButtons />)
}

describe('WorkspaceActionButtons', () => {
  // Why explicit: this config has no global testing-library cleanup, so a left-over
  // render would answer the next test's queries.
  afterEach(cleanup)

  it('puts the first action on the face and the rest one click deep', async () => {
    renderWith(['commit-and-push', 'review', 're-review'])

    expect(screen.getByRole('button', { name: 'Commit & push' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'More workspace actions' }))
    expect(await screen.findByRole('menuitem', { name: 'Review' })).toBeTruthy()
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Re-review' }))
    expect(mocks.launch).toHaveBeenCalledWith('re-review')
  })

  it('launches the primary action from the main segment', async () => {
    renderWith(['resolve-conflicts', 'review', 're-review'])

    await userEvent.click(screen.getByRole('button', { name: 'Resolve conflicts' }))
    expect(mocks.launch).toHaveBeenCalledWith('resolve-conflicts')
  })

  it('offers no chevron when only one action applies', () => {
    renderWith(['ready-for-review'])

    expect(screen.getByRole('button', { name: 'Ready for review' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'More workspace actions' })).toBeNull()
  })

  it('runs the review pipeline from the Review button without a pull request', async () => {
    renderWith([], true)

    await userEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(mocks.launch).toHaveBeenCalledWith('review')
    expect(screen.queryByRole('button', { name: 'More workspace actions' })).toBeNull()
  })

  it('keeps the branch review behind the step the branch is actually waiting on', async () => {
    renderWith(['commit-and-push'], true)

    expect(screen.getByRole('button', { name: 'Commit & push' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'More workspace actions' }))
    expect(await screen.findByRole('menuitem', { name: 'Review' })).toBeTruthy()
  })

  it('renders nothing when the branch has no action to take', () => {
    renderWith([])

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows no review entries when the resolver left them out', async () => {
    renderWith(['create-pull-request', 'create-draft-pull-request'])

    await userEvent.click(screen.getByRole('button', { name: 'More workspace actions' }))
    expect(await screen.findByRole('menuitem', { name: 'Create draft PR' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Review' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'Re-review' })).toBeNull()
  })
})
