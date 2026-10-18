import { describe, expect, it } from 'vitest'
import type { WorktreePaletteItem } from '../worktree-jump-palette-model'
import { makeRepo, makeWorktree } from '../worktree-jump-palette-test-fixtures'
import {
  archivedWorkspaceMatchesQuery,
  buildArchivedWorkspacePaletteEntries,
  listRecentArchivedWorkspaces
} from './archived-workspace-palette'

describe('listRecentArchivedWorkspaces', () => {
  it('keeps only archived workspaces, most recently visited first', () => {
    const quiet = makeWorktree('quiet', 'Quiet archive', {
      isArchived: true,
      lastActivityAt: 9_000
    })
    const visited = makeWorktree('visited', 'Visited archive', {
      isArchived: true,
      lastActivityAt: 1
    })
    const live = makeWorktree('live', 'Live workspace', { lastActivityAt: 50_000 })

    expect(
      listRecentArchivedWorkspaces([live, quiet, visited], { visited: 100 }).map(
        (worktree) => worktree.id
      )
    ).toEqual(['visited', 'quiet'])
  })

  it('falls back to last activity when nothing has been visited', () => {
    const older = makeWorktree('older', 'Older archive', {
      isArchived: true,
      lastActivityAt: 10
    })
    const newer = makeWorktree('newer', 'Newer archive', {
      isArchived: true,
      lastActivityAt: 20
    })

    expect(listRecentArchivedWorkspaces([older, newer], {}).map((worktree) => worktree.id)).toEqual(
      ['newer', 'older']
    )
  })
})

describe('archivedWorkspaceMatchesQuery', () => {
  it('matches the name, branch, or project the row shows', () => {
    const worktree = makeWorktree('billing', 'Billing cleanup', {
      isArchived: true,
      branch: 'refs/heads/fix-invoices'
    })

    expect(archivedWorkspaceMatchesQuery(worktree, 'billing', 'Payments')).toBe(true)
    expect(archivedWorkspaceMatchesQuery(worktree, 'invoices', 'Payments')).toBe(true)
    expect(archivedWorkspaceMatchesQuery(worktree, 'payments', 'Payments')).toBe(true)
    expect(archivedWorkspaceMatchesQuery(worktree, 'missing', 'Payments')).toBe(false)
    expect(archivedWorkspaceMatchesQuery(worktree, '   ', 'Payments')).toBe(true)
  })
})

describe('buildArchivedWorkspacePaletteEntries', () => {
  it('lists every matching archive in recency order under one header', () => {
    const older = makeWorktree('older', 'Older archive', {
      isArchived: true,
      lastActivityAt: 10
    })
    const newer = makeWorktree('newer', 'Newer archive', {
      isArchived: true,
      lastActivityAt: 20
    })
    const entries = buildArchivedWorkspacePaletteEntries({
      worktrees: [older, newer],
      lastVisitedAtByWorktreeId: {},
      repos: [makeRepo()],
      query: 'archive'
    })

    expect(entries.map((entry) => entry.type)).toEqual(['section-header', 'worktree', 'worktree'])
    expect(
      entries
        .filter((entry): entry is WorktreePaletteItem => entry.type === 'worktree')
        .map((entry) => entry.worktree.id)
    ).toEqual(['newer', 'older'])
  })

  it('returns nothing when the query misses every archive', () => {
    const archived = makeWorktree('older', 'Older archive', { isArchived: true })
    expect(
      buildArchivedWorkspacePaletteEntries({
        worktrees: [archived],
        lastVisitedAtByWorktreeId: {},
        repos: [makeRepo()],
        query: 'nope'
      })
    ).toEqual([])
  })
})
