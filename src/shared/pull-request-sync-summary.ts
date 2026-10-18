/** What one pull-request sync tick changed. A zero summary folds into the previous no-op row. */
export type PullRequestSyncTickSummary = {
  statusUpdates: number
  creations: number
  removals: number
  archives: number
  conflictAgents: number
  headSyncs: number
}

export const PULL_REQUEST_SYNC_NO_OP_TEXT = 'Checked pull requests. Nothing changed.'

export function emptyPullRequestSyncTickSummary(): PullRequestSyncTickSummary {
  return {
    statusUpdates: 0,
    creations: 0,
    removals: 0,
    archives: 0,
    conflictAgents: 0,
    headSyncs: 0
  }
}

export function isPullRequestSyncNoOp(summary: PullRequestSyncTickSummary): boolean {
  return (
    summary.statusUpdates === 0 &&
    summary.creations === 0 &&
    summary.removals === 0 &&
    summary.archives === 0 &&
    summary.conflictAgents === 0 &&
    summary.headSyncs === 0
  )
}

function countPhrase(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** The run row's snapshot. A no-op is one fixed sentence so repeats can fold. */
export function formatPullRequestSyncTickSummary(summary: PullRequestSyncTickSummary): string {
  if (isPullRequestSyncNoOp(summary)) {
    return PULL_REQUEST_SYNC_NO_OP_TEXT
  }
  const parts: string[] = []
  if (summary.statusUpdates > 0) {
    parts.push(countPhrase(summary.statusUpdates, 'workspace moved', 'workspaces moved'))
  }
  if (summary.creations > 0) {
    parts.push(countPhrase(summary.creations, 'review opened', 'reviews opened'))
  }
  if (summary.removals > 0) {
    parts.push(countPhrase(summary.removals, 'workspace removed', 'workspaces removed'))
  }
  if (summary.archives > 0) {
    parts.push(countPhrase(summary.archives, 'workspace archived', 'workspaces archived'))
  }
  if (summary.conflictAgents > 0) {
    parts.push(
      countPhrase(summary.conflictAgents, 'conflict agent launched', 'conflict agents launched')
    )
  }
  if (summary.headSyncs > 0) {
    parts.push(countPhrase(summary.headSyncs, 'review head synced', 'review heads synced'))
  }
  return parts.join(', ')
}
