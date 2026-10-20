import type { AppState } from '../../store/types'
import { getRepoMapFromState, getWorktreeMapFromState } from '../../store/selectors'
import type {
  CheckStatus,
  PRInfo,
  PRMergeableState,
  PRReviewDecision
} from '../../../../shared/github/pull-request-types'
import type { HostedReviewInfo, HostedReviewState } from '../../../../shared/hosted-review'
import { isFolderRepo } from '../../../../shared/repo-kind'
import { getGitHubPRCacheKey } from '../../store/slices/github-cache-key'
import { getHostedReviewCacheKey } from '../../store/slices/hosted-review-cache-identity'
import { isGitHubPRSuppressed } from '../../../../shared/worktree/github-pr-suppression'

// Why one list: the parameter type and the cache key both derive from it, so a new store field
// cannot be read here (TS rejects it) without also invalidating the cache on it.
const REQUIRED_INPUT_KEYS = [
  'activeWorktreeId',
  'worktreesByRepo',
  'repos',
  'prCache'
] as const satisfies readonly (keyof AppState)[]
const OPTIONAL_INPUT_KEYS = [
  'settings',
  'hostedReviewCache'
] as const satisfies readonly (keyof AppState)[]
/** @internal Every store field getActiveChecksStatus may read; the cache invalidates on any of them. */
export const ACTIVE_CHECKS_STATUS_INPUT_KEYS = [
  ...REQUIRED_INPUT_KEYS,
  ...OPTIONAL_INPUT_KEYS
] as const

type ActiveChecksStatusState = Pick<AppState, (typeof REQUIRED_INPUT_KEYS)[number]> &
  Partial<Pick<AppState, (typeof OPTIONAL_INPUT_KEYS)[number]>>
type ActiveChecksStatusInputs = {
  [K in (typeof ACTIVE_CHECKS_STATUS_INPUT_KEYS)[number]]: ActiveChecksStatusState[K]
}

function branchDisplayName(branch: string): string {
  return branch.replace(/^refs\/heads\//, '')
}

// Why cached: the right sidebar is always mounted, so this ran on every store write and rebuilt two
// cache-key strings each time. Same single-entry, reference-keyed shape as selectFloatingVisibleTabCount.
let activeChecksStatusCache: {
  inputs: ActiveChecksStatusInputs
  status: CheckStatus | null
} | null = null

/** @internal */
export function clearActiveChecksStatusCacheForTests(): void {
  activeChecksStatusCache = null
}

function hasSameInputs(inputs: ActiveChecksStatusInputs, state: ActiveChecksStatusState): boolean {
  for (const key of ACTIVE_CHECKS_STATUS_INPUT_KEYS) {
    if (inputs[key] !== state[key]) {
      return false
    }
  }
  return true
}

export function getActiveChecksStatus(state: ActiveChecksStatusState): CheckStatus | null {
  const cached = activeChecksStatusCache
  if (cached && hasSameInputs(cached.inputs, state)) {
    return cached.status
  }
  const status = computeActiveChecksStatus(state)
  const inputs = Object.fromEntries(
    ACTIVE_CHECKS_STATUS_INPUT_KEYS.map((key) => [key, state[key]])
  ) as ActiveChecksStatusInputs
  activeChecksStatusCache = { inputs, status }
  return status
}

export type ActiveReviewSnapshot = {
  state: HostedReviewState
  checks: CheckStatus
  mergeable: PRMergeableState
  reviewDecision: PRReviewDecision | null
  mergeStateStatus: string | null
}

export type ActiveReviewResolution = {
  worktreeId: string
  isFolderWorkspace: boolean
  review: ActiveReviewSnapshot | null
  hasLinkedReview: boolean
}

function fromGitHubPR(pr: PRInfo): ActiveReviewSnapshot {
  return {
    state: pr.state,
    checks: pr.checksStatus,
    mergeable: pr.mergeable,
    reviewDecision: pr.reviewDecision ?? null,
    mergeStateStatus: pr.mergeStateStatus ?? null
  }
}

function fromHostedReview(review: HostedReviewInfo): ActiveReviewSnapshot {
  return {
    state: review.state,
    checks: review.status,
    mergeable: review.mergeable,
    reviewDecision: review.reviewDecision ?? null,
    mergeStateStatus: review.mergeStateStatus ?? null
  }
}

export function resolveActiveReview(state: ActiveChecksStatusState): ActiveReviewResolution | null {
  const activeWorktree = state.activeWorktreeId
    ? (getWorktreeMapFromState(state).get(state.activeWorktreeId) ?? null)
    : null
  if (!activeWorktree) {
    return null
  }

  const activeRepo = getRepoMapFromState(state).get(activeWorktree.repoId)
  if (!activeRepo) {
    return null
  }
  const base = {
    worktreeId: activeWorktree.id,
    isFolderWorkspace: isFolderRepo(activeRepo)
  }

  const branch = branchDisplayName(activeWorktree.branch)
  if (!branch) {
    return { ...base, review: null, hasLinkedReview: false }
  }

  // Why: PR refreshes are written under repo-id scoped keys so repo path
  // changes and legacy duplicates cannot leave the activity indicator stale.
  const prCacheKey = getGitHubPRCacheKey(
    activeRepo.path,
    activeRepo.id,
    branch,
    state.settings,
    activeRepo.connectionId,
    activeRepo.executionHostId,
    true
  )
  const hostedReviewCacheKey = getHostedReviewCacheKey(
    activeRepo.path,
    branch,
    state.settings,
    activeRepo.id,
    activeRepo.connectionId,
    activeRepo.executionHostId,
    true
  )
  const hostedReview = state.hostedReviewCache?.[hostedReviewCacheKey]?.data ?? null
  if (hostedReview && hostedReview.provider !== 'github') {
    return { ...base, review: fromHostedReview(hostedReview), hasLinkedReview: true }
  }
  if (
    (activeWorktree.linkedGitLabMR ?? null) !== null ||
    (activeWorktree.linkedBitbucketPR ?? null) !== null ||
    (activeWorktree.linkedAzureDevOpsPR ?? null) !== null ||
    (activeWorktree.linkedGiteaPR ?? null) !== null
  ) {
    return { ...base, review: null, hasLinkedReview: true }
  }
  const branchPR = state.prCache[prCacheKey]?.data ?? null
  if (branchPR && !isGitHubPRSuppressed(activeWorktree, branchPR.number)) {
    return { ...base, review: fromGitHubPR(branchPR), hasLinkedReview: false }
  }
  const review =
    hostedReview?.provider === 'github' &&
    !isGitHubPRSuppressed(activeWorktree, hostedReview.number)
      ? fromHostedReview(hostedReview)
      : null
  return { ...base, review, hasLinkedReview: false }
}

function computeActiveChecksStatus(state: ActiveChecksStatusState): CheckStatus | null {
  return resolveActiveReview(state)?.review?.checks ?? null
}
