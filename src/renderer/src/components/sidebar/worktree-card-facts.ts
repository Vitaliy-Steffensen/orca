import type { DiffAreaFile, DiffAreaTotals } from '../../../../shared/diff-area'
import { summarizeDiffAreas } from '../../../../shared/diff-area'
import type { GitHubPRStack } from '../../../../shared/github/pull-request-types'
import type { GitBranchLineTotal } from '../../../../shared/git-status-types'
import { linearPriorityLabel } from '../../../../shared/linear/priority-label'
import { pullRequestOpenAgeDays } from '../../../../shared/pr-open-age'
import type { WorktreeCardProperty } from '../../../../shared/ui-chrome-types'

export type WorktreeCardFactReview = {
  state?: string
  createdAt?: string
  additions?: number
  deletions?: number
  changedFiles?: number
  diffAreas?: DiffAreaTotals
  unresolvedComments?: number
  unresolvedCommentsTruncated?: boolean
  stack?: GitHubPRStack
}

export type WorktreeCardFact =
  | { id: 'diff'; added: number; removed: number; files?: number }
  | { id: 'diff-mix'; areas: DiffAreaTotals }
  | { id: 'linear-priority'; priority: 1 | 2 | 3 | 4; label: 'urgent' | 'high' | 'medium' | 'low' }
  | { id: 'stack'; position: number; size: number }
  | { id: 'unresolved-comments'; count: number; truncated: boolean }
  | { id: 'pr-open-age'; days: number }

const FACT_ORDER: WorktreeCardFact['id'][] = [
  'diff',
  'diff-mix',
  'linear-priority',
  'stack',
  'unresolved-comments',
  'pr-open-age'
]

function enabled(cardProps: readonly WorktreeCardProperty[], id: WorktreeCardFact['id']): boolean {
  return cardProps.includes(id)
}

function lineTotalFiles(total: GitBranchLineTotal | null | undefined): DiffAreaFile[] {
  const files = total?.files
  if (!files) {
    return []
  }
  return Object.entries(files).map(([path, stats]) => ({
    path,
    ...(typeof stats.added === 'number' ? { additions: stats.added } : {}),
    ...(typeof stats.removed === 'number' ? { deletions: stats.removed } : {})
  }))
}

function diffFact(
  review: WorktreeCardFactReview | null,
  branchLineTotal: GitBranchLineTotal | null | undefined
): Extract<WorktreeCardFact, { id: 'diff' }> | null {
  if (typeof review?.additions === 'number' || typeof review?.deletions === 'number') {
    const added = review.additions ?? 0
    const removed = review.deletions ?? 0
    if (added === 0 && removed === 0) {
      return null
    }
    return {
      id: 'diff',
      added,
      removed,
      ...(typeof review.changedFiles === 'number' ? { files: review.changedFiles } : {})
    }
  }
  const added = branchLineTotal?.added ?? 0
  const removed = branchLineTotal?.removed ?? 0
  if (added === 0 && removed === 0) {
    return null
  }
  return { id: 'diff', added, removed }
}

function mixFact(
  review: WorktreeCardFactReview | null,
  branchLineTotal: GitBranchLineTotal | null | undefined
): Extract<WorktreeCardFact, { id: 'diff-mix' }> | null {
  const areas = review?.diffAreas ?? summarizeDiffAreas(lineTotalFiles(branchLineTotal))
  if (!areas) {
    return null
  }
  return { id: 'diff-mix', areas }
}

/**
 * The card's review facts. Each one is omitted when its property is off or it has
 * nothing worth showing: no empty pie, no "0 comments", no priority of none, no
 * age until the pull request has been open longer than three days.
 */
export function resolveWorktreeCardFacts(input: {
  cardProps: readonly WorktreeCardProperty[]
  review: WorktreeCardFactReview | null
  linearPriority?: number | null
  branchLineTotal?: GitBranchLineTotal | null
  now?: number
}): WorktreeCardFact[] {
  const facts: WorktreeCardFact[] = []
  if (enabled(input.cardProps, 'diff')) {
    const diff = diffFact(input.review, input.branchLineTotal)
    if (diff) {
      facts.push(diff)
    }
  }
  if (enabled(input.cardProps, 'diff-mix')) {
    const mix = mixFact(input.review, input.branchLineTotal)
    if (mix) {
      facts.push(mix)
    }
  }
  if (enabled(input.cardProps, 'linear-priority')) {
    const label = linearPriorityLabel(input.linearPriority)
    if (
      label !== 'none' &&
      (input.linearPriority === 1 ||
        input.linearPriority === 2 ||
        input.linearPriority === 3 ||
        input.linearPriority === 4)
    ) {
      facts.push({ id: 'linear-priority', priority: input.linearPriority, label })
    }
  }
  const stack = input.review?.stack
  if (enabled(input.cardProps, 'stack') && stack && stack.size > 1) {
    facts.push({ id: 'stack', position: stack.position, size: stack.size })
  }
  const unresolved = input.review?.unresolvedComments
  if (
    enabled(input.cardProps, 'unresolved-comments') &&
    typeof unresolved === 'number' &&
    unresolved > 0
  ) {
    facts.push({
      id: 'unresolved-comments',
      count: unresolved,
      truncated: input.review?.unresolvedCommentsTruncated === true
    })
  }
  if (enabled(input.cardProps, 'pr-open-age')) {
    const days = pullRequestOpenAgeDays(input.review?.createdAt, input.review?.state, input.now)
    if (days !== null) {
      facts.push({ id: 'pr-open-age', days })
    }
  }
  return facts.sort((a, b) => FACT_ORDER.indexOf(a.id) - FACT_ORDER.indexOf(b.id))
}
