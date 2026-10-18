import { describe, expect, it } from 'vitest'
import { getCmdJQuickActions } from './quick-actions'

function viewArchivedAction() {
  const action = getCmdJQuickActions().find((entry) => entry.id === 'view-archived-workspaces')
  if (!action) {
    throw new Error('view-archived-workspaces quick action is missing')
  }
  return action
}

describe('the View Archived Workspaces quick action', () => {
  it('is always offered, since there is no active workspace to need', () => {
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: isAvailable ignores its context here.
    expect(viewArchivedAction().isAvailable({} as never)).toEqual({ available: true })
  })

  it('keeps the palette open so the archive list can take over', async () => {
    expect(viewArchivedAction().keepPaletteOpen).toBe(true)
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: run ignores its context here.
    await expect(viewArchivedAction().run({} as never)).resolves.toEqual({ status: 'ok' })
  })

  it('answers to the words someone would actually type', () => {
    expect(viewArchivedAction().verbKeywords).toEqual(
      expect.arrayContaining(['archived', 'unarchive'])
    )
  })
})
