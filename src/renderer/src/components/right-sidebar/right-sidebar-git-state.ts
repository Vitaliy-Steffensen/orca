import type { AppState } from '../../store/types'
import { translate } from '@/i18n/i18n'
import { resolveActiveReview, type ActiveReviewResolution } from './active-checks-status'
import type { GitConflictOperation, GitUpstreamStatus } from '../../../../shared/git-status-types'

export type GitStateId =
  | 'merged'
  | 'closed'
  | 'local-only'
  | 'draft'
  | 'merge-conflicts'
  | 'ci-failed'
  | 'changes-requested'
  | 'ci-pending'
  | 'awaiting-review'
  | 'behind'
  | 'ready'

export type GitStateTone = 'success' | 'warning' | 'destructive' | 'muted'

export type GitState = {
  id: GitStateId
  tone: GitStateTone
  label: string
  tooltip: string
}

type GitStateInputs = {
  resolution: ActiveReviewResolution | null
  upstream: GitUpstreamStatus | undefined
  conflictOperation: GitConflictOperation | undefined
}

function gitState(id: GitStateId, tone: GitStateTone, label: string, tooltip: string): GitState {
  return { id, tone, label, tooltip }
}

export function deriveGitState({
  resolution,
  upstream,
  conflictOperation
}: GitStateInputs): GitState | null {
  if (!resolution || resolution.isFolderWorkspace) {
    return null
  }
  const { review } = resolution

  if (review?.state === 'merged') {
    return gitState(
      'merged',
      'muted',
      translate('rightSidebar.gitState.merged', 'Merged'),
      translate('rightSidebar.gitState.mergedTooltip', 'This pull request is merged')
    )
  }
  if (review?.state === 'closed') {
    return gitState(
      'closed',
      'muted',
      translate('rightSidebar.gitState.closed', 'Closed'),
      translate('rightSidebar.gitState.closedTooltip', 'This pull request is closed')
    )
  }

  const conflicted =
    conflictOperation !== undefined ||
    review?.mergeable === 'CONFLICTING' ||
    review?.mergeStateStatus === 'DIRTY'
  const conflictState = gitState(
    'merge-conflicts',
    'destructive',
    translate('rightSidebar.gitState.mergeConflicts', 'Merge conflicts'),
    translate('rightSidebar.gitState.mergeConflictsTooltip', 'Resolve conflicts before merging')
  )

  if (!review) {
    if (conflicted) {
      return conflictState
    }
    if (resolution.hasLinkedReview || !upstream || upstream.hasUpstream) {
      return null
    }
    return gitState(
      'local-only',
      'muted',
      translate('rightSidebar.gitState.localOnly', 'Local only'),
      translate('rightSidebar.gitState.localOnlyTooltip', 'This branch has not been pushed')
    )
  }

  if (review.state === 'draft') {
    return gitState(
      'draft',
      'muted',
      translate('rightSidebar.gitState.draft', 'Draft PR'),
      translate('rightSidebar.gitState.draftTooltip', 'This pull request is still a draft')
    )
  }
  if (conflicted) {
    return conflictState
  }
  if (review.checks === 'failure') {
    return gitState(
      'ci-failed',
      'destructive',
      translate('rightSidebar.gitState.ciFailed', 'CI failed'),
      translate('rightSidebar.gitState.ciFailedTooltip', 'One or more checks failed')
    )
  }
  if (review.reviewDecision === 'CHANGES_REQUESTED') {
    return gitState(
      'changes-requested',
      'warning',
      translate('rightSidebar.gitState.changesRequested', 'Changes requested'),
      translate('rightSidebar.gitState.changesRequestedTooltip', 'A reviewer asked for changes')
    )
  }
  if (review.checks === 'pending') {
    return gitState(
      'ci-pending',
      'muted',
      translate('rightSidebar.gitState.ciPending', 'Waiting for CI'),
      translate('rightSidebar.gitState.ciPendingTooltip', 'Checks are still running')
    )
  }
  if (review.reviewDecision === 'REVIEW_REQUIRED') {
    return gitState(
      'awaiting-review',
      'warning',
      translate('rightSidebar.gitState.awaitingReview', 'Awaiting review'),
      translate('rightSidebar.gitState.awaitingReviewTooltip', 'A review approval is required')
    )
  }
  if (review.mergeStateStatus === 'BEHIND') {
    return gitState(
      'behind',
      'warning',
      translate('rightSidebar.gitState.behind', 'Behind base'),
      translate('rightSidebar.gitState.behindTooltip', 'Update the branch before merging')
    )
  }
  if (review.mergeable === 'UNKNOWN' && review.mergeStateStatus === null) {
    return null
  }
  return gitState(
    'ready',
    'success',
    translate('rightSidebar.gitState.ready', 'Ready to merge'),
    translate('rightSidebar.gitState.readyTooltip', 'Checks passed and nothing blocks the merge')
  )
}

const INPUT_KEYS = [
  'activeWorktreeId',
  'worktreesByRepo',
  'repos',
  'prCache',
  'hostedReviewCache',
  'settings',
  'remoteStatusesByWorktree',
  'gitConflictOperationByWorktree'
] as const satisfies readonly (keyof AppState)[]

type ActiveGitStateInputs = Pick<AppState, (typeof INPUT_KEYS)[number]>

let cache: { inputs: ActiveGitStateInputs; result: GitState | null } | null = null

/** @internal */
export function clearActiveGitStateCacheForTests(): void {
  cache = null
}

// Why: the right sidebar is always mounted, so the selector runs on every store write; the key
// list keeps the single-entry cache honest, same shape as getActiveChecksStatus.
export function getActiveGitState(state: ActiveGitStateInputs): GitState | null {
  if (cache && INPUT_KEYS.every((key) => cache?.inputs[key] === state[key])) {
    return cache.result
  }
  const resolution = resolveActiveReview(state)
  const worktreeId = resolution?.worktreeId
  const result = deriveGitState({
    resolution,
    upstream: worktreeId ? state.remoteStatusesByWorktree[worktreeId] : undefined,
    conflictOperation: worktreeId ? state.gitConflictOperationByWorktree[worktreeId] : undefined
  })
  cache = {
    inputs: {
      activeWorktreeId: state.activeWorktreeId,
      worktreesByRepo: state.worktreesByRepo,
      repos: state.repos,
      prCache: state.prCache,
      hostedReviewCache: state.hostedReviewCache,
      settings: state.settings,
      remoteStatusesByWorktree: state.remoteStatusesByWorktree,
      gitConflictOperationByWorktree: state.gitConflictOperationByWorktree
    },
    result
  }
  return result
}
