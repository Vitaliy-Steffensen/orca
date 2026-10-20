// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

type ActionContextStub = {
  action: string | null
  pr: { state: string } | null
  canReviewBranch: boolean
}

const mocks = vi.hoisted(() => {
  const state: ActionContextStub = {
    action: 'create-pull-request',
    pr: { state: 'open' },
    canReviewBranch: true
  }
  return { state, launch: vi.fn() }
})

vi.mock('@/store', () => ({
  useAppStore: (selector: (state: ActionContextStub) => unknown) => selector(mocks.state)
}))
vi.mock('./workspace-action-context', () => ({
  selectWorkspaceActionContext: (state: ActionContextStub) => state
}))
vi.mock('./launch-workspace-action', () => ({ launchWorkspaceAction: mocks.launch }))
vi.mock('@/i18n/i18n', () => ({ translate: (_key: string, fallback: string) => fallback }))

import { WorkspaceActionButtons } from './WorkspaceActionButtons'

describe('WorkspaceActionButtons', () => {
  // Why explicit: this config has no global testing-library cleanup, so a left-over
  // render would answer the next test's queries.
  afterEach(cleanup)

  it('keeps Re-review one click deep behind the Review button while a pull request is open', async () => {
    mocks.launch.mockReset().mockResolvedValue(undefined)
    render(<WorkspaceActionButtons />)

    expect(screen.getByRole('button', { name: 'Review' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'More review actions' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Re-review' }))
    expect(mocks.launch).toHaveBeenCalledWith('re-review')
  })

  it('offers Create draft PR from the Create PR chevron', async () => {
    mocks.launch.mockReset().mockResolvedValue(undefined)
    render(<WorkspaceActionButtons />)

    expect(screen.getByRole('button', { name: 'Create PR' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'More pull request actions' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Create draft PR' }))
    expect(mocks.launch).toHaveBeenCalledWith('primary-draft')
  })

  it('offers no chevron on a primary action that has no second form', () => {
    mocks.state.action = 'commit-and-push'
    render(<WorkspaceActionButtons />)

    expect(screen.getByRole('button', { name: 'Commit & push' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'More pull request actions' })).toBeNull()
  })

  it('runs the review pipeline from the Review button without a pull request', async () => {
    mocks.launch.mockReset().mockResolvedValue(undefined)
    mocks.state.pr = null
    render(<WorkspaceActionButtons />)

    await userEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(mocks.launch).toHaveBeenCalledWith('review')
    expect(screen.queryByRole('button', { name: 'More review actions' })).toBeNull()
  })

  it('hides the whole review control when there is nothing to review', () => {
    mocks.state.action = 'create-pull-request'
    mocks.state.pr = null
    mocks.state.canReviewBranch = false
    render(<WorkspaceActionButtons />)

    expect(screen.queryByRole('button', { name: 'Review' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'More review actions' })).toBeNull()
  })
})
