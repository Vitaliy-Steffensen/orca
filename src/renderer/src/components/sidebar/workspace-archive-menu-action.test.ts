import { describe, expect, it } from 'vitest'
import { resolveWorkspaceArchiveMenuAction } from './workspace-archive-menu-action'

const makeWorktree = (id: string, isArchived: boolean): { id: string; isArchived: boolean } => ({
  id,
  isArchived
})

describe('resolveWorkspaceArchiveMenuAction', () => {
  it('offers Archive on a live workspace and Unarchive on an archived one', () => {
    const live = makeWorktree('live', false)
    const archived = makeWorktree('archived', true)

    expect(resolveWorkspaceArchiveMenuAction(live, [live], false)).toMatchObject({
      isRestore: false,
      label: 'Archive'
    })
    expect(resolveWorkspaceArchiveMenuAction(archived, [archived], false)).toMatchObject({
      isRestore: true,
      label: 'Unarchive'
    })
  })

  it('counts only the rows pointing the same way as the one right-clicked', () => {
    const live = makeWorktree('live', false)
    const other = makeWorktree('other', false)
    const archived = makeWorktree('archived', true)

    const action = resolveWorkspaceArchiveMenuAction(live, [live, other, archived], true)

    expect(action.label).toBe('Archive 2 Workspaces')
    expect(action.targets.map((target) => target.id)).toEqual(['live', 'other'])
  })

  it('has no targets when the selection points the other way entirely', () => {
    const archived = makeWorktree('archived', true)
    const live = makeWorktree('live', false)

    // Why: the item is disabled rather than silently acting on nothing.
    expect(resolveWorkspaceArchiveMenuAction(archived, [live], true).targets).toEqual([])
  })
})
