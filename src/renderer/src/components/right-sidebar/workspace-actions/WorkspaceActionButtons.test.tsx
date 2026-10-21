// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { WorkspaceActionKind } from '../../../../../shared/workspace-action'

type ActionContextStub = { actions: WorkspaceActionKind[] }

const mocks = vi.hoisted(() => {
  const state: { actions: WorkspaceActionKind[] } = { actions: [] }
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

function renderWith(actions: WorkspaceActionKind[]): void {
  mocks.state.actions = actions
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
