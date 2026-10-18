import type { Repo } from '../../../../shared/repo-types'
import type { Worktree } from '../../../../shared/worktree/types'
import { translate } from '@/i18n/i18n'
import { encodePaletteIdentity } from '@/lib/palette-match/palette-ranking'
import { getPaletteWorktreeIdentity } from '@/lib/palette-repo-resolution'
import type { PaletteSearchResult } from '@/lib/worktree-palette-search'
import { comparePaletteWorktreeRecency } from '@/lib/order-empty-query-worktrees'
import {
  resolveWorktreeBranchLabel,
  resolveWorktreeDisplayName
} from '@/lib/worktree-default-display-name'
import type { PaletteListEntry, WorktreePaletteItem } from '../worktree-jump-palette-model'

export function listRecentArchivedWorkspaces(
  worktrees: readonly Worktree[],
  lastVisitedAtByWorktreeId: Readonly<Record<string, number>>
): Worktree[] {
  return worktrees
    .filter((worktree) => worktree.isArchived)
    .sort((a, b) => comparePaletteWorktreeRecency(lastVisitedAtByWorktreeId, a, b))
}

export function archivedWorkspaceMatchesQuery(
  worktree: Worktree,
  query: string,
  repoName: string
): boolean {
  const needle = query.trim().toLowerCase()
  if (needle.length === 0) {
    return true
  }
  const haystack = [
    resolveWorktreeDisplayName(worktree),
    resolveWorktreeBranchLabel(worktree),
    repoName
  ]
    .join('\n')
    .toLowerCase()
  return haystack.includes(needle)
}

function archivedWorktreeItem(worktree: Worktree): WorktreePaletteItem {
  const match: PaletteSearchResult = {
    worktreeId: worktree.id,
    ...(worktree.hostId ? { worktreeHostId: worktree.hostId } : {}),
    matchedFields: [],
    displayNameRanges: [],
    branchRanges: [],
    repoRanges: [],
    hostRanges: [],
    supportingText: null,
    qualityClass: null,
    rank: null,
    lastActiveAt: worktree.lastActivityAt > 0 ? worktree.lastActivityAt : null,
    activity: {
      ageBucket: null,
      timestamp: worktree.lastActivityAt > 0 ? worktree.lastActivityAt : 0
    }
  }
  return {
    id: encodePaletteIdentity(['worktree', getPaletteWorktreeIdentity(worktree)]),
    type: 'worktree',
    match,
    worktree
  }
}

/**
 * Every archived workspace, newest first. No section cap: this view exists to
 * browse the archive, and the list scrolls.
 */
export function buildArchivedWorkspacePaletteEntries({
  worktrees,
  lastVisitedAtByWorktreeId,
  repos,
  query
}: {
  worktrees: readonly Worktree[]
  lastVisitedAtByWorktreeId: Readonly<Record<string, number>>
  repos: readonly Pick<Repo, 'id' | 'displayName'>[]
  query: string
}): PaletteListEntry[] {
  const repoNameById = new Map(repos.map((repo) => [repo.id, repo.displayName]))
  const matches = listRecentArchivedWorkspaces(worktrees, lastVisitedAtByWorktreeId).filter(
    (worktree) =>
      archivedWorkspaceMatchesQuery(worktree, query, repoNameById.get(worktree.repoId) ?? '')
  )
  if (matches.length === 0) {
    return []
  }
  return [
    {
      id: '__header_archived_workspaces__',
      type: 'section-header',
      label: translate(
        'auto.components.WorktreeJumpPalette.archivedWorkspacesHeader',
        'Archived workspaces'
      )
    },
    ...matches.map(archivedWorktreeItem)
  ]
}
