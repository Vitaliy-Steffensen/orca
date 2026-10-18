import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const state = {
    showArchivedWorkspaces: false,
    setShowArchivedWorkspaces: vi.fn((value: boolean) => {
      state.showArchivedWorkspaces = value
    })
  }
  return { state }
})

vi.mock('@/store', () => ({ useAppStore: { getState: () => mocks.state } }))

import { getCmdJQuickActions } from './quick-actions'

function viewArchivedAction() {
  const action = getCmdJQuickActions().find((entry) => entry.id === 'view-archived-workspaces')
  if (!action) {
    throw new Error('view-archived-workspaces quick action is missing')
  }
  return action
}

describe('the View Archived Workspaces quick action', () => {
  beforeEach(() => {
    mocks.state.showArchivedWorkspaces = false
    mocks.state.setShowArchivedWorkspaces.mockClear()
  })

  it('is always offered, since there is no active workspace to need', () => {
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: isAvailable ignores its context here.
    expect(viewArchivedAction().isAvailable({} as never)).toEqual({ available: true })
  })

  it('toggles the reveal both ways', async () => {
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: run ignores its context here.
    await expect(viewArchivedAction().run({} as never)).resolves.toEqual({ status: 'ok' })
    expect(mocks.state.setShowArchivedWorkspaces).toHaveBeenLastCalledWith(true)

    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: run ignores its context here.
    await viewArchivedAction().run({} as never)
    expect(mocks.state.setShowArchivedWorkspaces).toHaveBeenLastCalledWith(false)
  })

  it('answers to the words someone would actually type', () => {
    expect(viewArchivedAction().verbKeywords).toEqual(
      expect.arrayContaining(['archived', 'unarchive'])
    )
  })
})
