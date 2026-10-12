import { useSyncExternalStore } from 'react'
import { translate } from '@/i18n/i18n'
import type { GitBranchChangeEntry } from '../../../shared/git-diff-compare-types'

export type ChangesCommitCompare = {
  commitOid: string
  parentOid: string | null
  compareRef: string
  baseRef: string
}

export type ChangesSourceFilter =
  | {
      kind: 'commit'
      compare: ChangesCommitCompare
      entries: GitBranchChangeEntry[]
      subject?: string
      message?: string
    }
  | {
      kind: 'turn'
      compare: ChangesCommitCompare
      entries: GitBranchChangeEntry[]
      prompt: string
      latest: boolean
    }

// Fork: what the Changes list shows. Uncommitted, a commit and an agent turn are one filter, so
// turning one on turns the other off. Outside the panel because shortcuts and the commit/turn
// links set it while the panel may be unmounted.
export type ChangesFilter = { kind: 'uncommitted' } | ChangesSourceFilter

let filters: ReadonlyMap<string, ChangesFilter> = new Map()
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function getChangesFilter(worktreeId: string): ChangesFilter | null {
  return filters.get(worktreeId) ?? null
}

export function setChangesFilter(worktreeId: string, filter: ChangesFilter | null): void {
  if (getChangesFilter(worktreeId) === filter) {
    return
  }
  const next = new Map(filters)
  if (filter) {
    next.set(worktreeId, filter)
  } else {
    next.delete(worktreeId)
  }
  filters = next
  emit()
}

export function clearChangesFilter(worktreeId: string): void {
  setChangesFilter(worktreeId, null)
}

export function isUncommittedOnly(worktreeId: string): boolean {
  return getChangesFilter(worktreeId)?.kind === 'uncommitted'
}

export function toggleUncommittedOnly(worktreeId: string): void {
  setChangesFilter(worktreeId, isUncommittedOnly(worktreeId) ? null : { kind: 'uncommitted' })
}

/** Keeps a previewed turn's badge honest: it is the latest turn only until a newer one lands. */
export function syncLatestAgentTurn(worktreeId: string, latestTurnOid: string | null): void {
  const filter = getChangesFilter(worktreeId)
  if (filter?.kind !== 'turn') {
    return
  }
  const latest = filter.compare.commitOid === latestTurnOid
  if (filter.latest !== latest) {
    setChangesFilter(worktreeId, { ...filter, latest })
  }
}

export function changesFilterBadge(
  filter: ChangesFilter | null
): { label: string; title?: string } | null {
  if (!filter) {
    return null
  }
  switch (filter.kind) {
    case 'uncommitted':
      return { label: translate('allChanges.uncommittedOnly', 'Uncommitted') }
    case 'turn':
      return {
        label: filter.latest
          ? translate('allChanges.latestTurn', 'Latest turn')
          : translate('allChanges.historicalChanges', 'Historical changes'),
        title: filter.prompt
      }
    case 'commit':
      return {
        label: translate('allChanges.commit', 'Commit {{ref}}', { ref: filter.compare.compareRef }),
        ...(filter.subject ? { title: filter.subject } : {})
      }
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useChangesFilter(worktreeId: string | null): ChangesFilter | null {
  const read = (): ChangesFilter | null => (worktreeId ? getChangesFilter(worktreeId) : null)
  return useSyncExternalStore(subscribe, read, read)
}
