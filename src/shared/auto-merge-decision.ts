import type { PRInfo } from './github/pull-request-types'
import type { ReviewSnapshotPullRequest } from './github/review-status-snapshot-types'
import { canEnableGitHubPRAutoMerge } from './github/pull-request-auto-merge-availability'
import {
  MAX_CHECK_REPAIR_ATTEMPTS_PER_HEAD,
  type WorkspaceAutoMergeAttempts,
  type WorkspaceAutoMergePolicy
} from './workspace-auto-merge-policy'

export type AutoMergeAction = 'none' | 'resolve-conflicts' | 'fix-checks' | 'enable-auto-merge'

export type AutoMergeDecision = {
  action: AutoMergeAction
  /** What `policy.attempts` should read after this tick; undefined clears it. */
  attempts: WorkspaceAutoMergeAttempts | undefined
  failingChecks: string[]
}

/** At most one action per workspace per tick, in the order a PR has to be healed. */
export function decideAutoMergeAction(input: {
  policy: WorkspaceAutoMergePolicy
  pr: Pick<ReviewSnapshotPullRequest, 'state' | 'isDraft' | 'mergeable' | 'headRefOid' | 'checks'>
  cachedPR: PRInfo | null
}): AutoMergeDecision {
  const { policy, pr } = input
  const failingChecks = pr.checks.filter((check) => check.state === 'failure').map((c) => c.name)
  if (pr.state !== 'OPEN') {
    return { action: 'none', attempts: undefined, failingChecks }
  }
  // Why: a new push is a fresh start, so the repair budget follows the head commit.
  const attempts: WorkspaceAutoMergeAttempts =
    policy.attempts?.headOid === pr.headRefOid
      ? policy.attempts
      : { headOid: pr.headRefOid, conflicts: 0, checks: 0 }
  // Why: GitHub reports UNKNOWN while it recomputes after a push; acting now would race it.
  if (pr.isDraft || pr.mergeable === 'UNKNOWN') {
    return { action: 'none', attempts, failingChecks }
  }
  if (pr.mergeable === 'CONFLICTING') {
    if (policy.resolveConflicts && attempts.conflicts === 0) {
      return {
        action: 'resolve-conflicts',
        attempts: { ...attempts, conflicts: attempts.conflicts + 1 },
        failingChecks
      }
    }
    return { action: 'none', attempts, failingChecks }
  }
  if (
    policy.fixFailingChecks &&
    failingChecks.length > 0 &&
    attempts.checks < MAX_CHECK_REPAIR_ATTEMPTS_PER_HEAD
  ) {
    return {
      action: 'fix-checks',
      attempts: { ...attempts, checks: attempts.checks + 1 },
      failingChecks
    }
  }
  // Why every tick: Orca is the source of truth, so auto-merge switched off on GitHub comes back.
  if (input.cachedPR && canEnableGitHubPRAutoMerge(input.cachedPR)) {
    return { action: 'enable-auto-merge', attempts, failingChecks }
  }
  return { action: 'none', attempts, failingChecks }
}
