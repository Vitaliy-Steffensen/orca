// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

type ActionContextStub = { action: string | null; pr: { state: string } | null }

const mocks = vi.hoisted(() => {
  const state: { action: string | null; pr: { state: string } | null } = {
    action: 'create-pull-request',
    pr: { state: 'open' }
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

  it('offers Re-review beside Review while a pull request is open', async () => {
    mocks.launch.mockReset().mockResolvedValue(undefined)
    render(<WorkspaceActionButtons />)

    expect(screen.getByRole('button', { name: 'Review' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Re-review' }))
    expect(mocks.launch).toHaveBeenCalledWith('re-review')
  })

  it('hides both review buttons when there is no pull request', () => {
    mocks.state.pr = null
    render(<WorkspaceActionButtons />)

    expect(screen.queryByRole('button', { name: 'Review' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Re-review' })).toBeNull()
  })
})
