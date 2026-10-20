import type { ExecutionHostId } from './execution-host'
import type { GitHubRepositoryIdentity } from './github/pull-request-types'
import type {
  ReviewSnapshotPullRequest,
  ReviewStatusSnapshot
} from './github/review-status-snapshot-types'
import {
  makeHandledPullRequestKey,
  type WorkspaceStatusRuleCondition,
  type WorkspaceStatusRuleConfig
} from './workspace-status-rule-config'
import {
  lowercaseLoginSet,
  readViewerReviewStanding,
  resolveWorkspaceStatusRule
} from './workspace-status-rules'
import type { WorkspaceStatus } from './worktree/types'

/** The inbox search returns at most one page, so this is the real ceiling on a
 *  single tick. Creations run one after another, never concurrently. */
export const MAX_REVIEW_INBOX_CREATES_PER_TICK = 30

/** A workspace with a resolved pull request, flattened so planning stays pure. */
export type WorkspaceStatusRuleTarget = {
  worktreeId: string
  executionHostId: ExecutionHostId
  displayName: string
  repo: GitHubRepositoryIdentity
  prNumber: number
  currentStatus: WorkspaceStatus | null
  headOid: string
  /** Unsent review comments live in metadata, not the tree, so git would not refuse the delete. */
  hasPendingReviewComments: boolean
  /** The workspace sits in a holding lane with its run still going; no rule may touch it. */
  isAutomationHeld?: boolean
}

export type WorkspaceStatusRulePlan = {
  statusUpdates: {
    worktreeId: string
    executionHostId: ExecutionHostId
    status: WorkspaceStatus
    condition: WorkspaceStatusRuleCondition
  }[]
  /** Attempted with force off, so Git refuses one holding uncommitted work or a live agent. */
  removals: {
    worktreeId: string
    executionHostId: ExecutionHostId
    displayName: string
    /** Set when the pull request should be eligible for the inbox again later. */
    forgetHandledKey?: string
  }[]
  /** Shut down and hidden, not removed; kept apart from `removals` because the
   *  delete-only ledger and force semantics do not transfer. */
  archives: {
    worktreeId: string
    executionHostId: ExecutionHostId
    displayName: string
    /** Set when the pull request should be eligible for the inbox again later. */
    forgetHandledKey?: string
  }[]
  creations: {
    pr: ReviewSnapshotPullRequest
    handledKey: string
    /** Present on a pull request reviewed before, so the diff opens on what changed since. */
    sinceReviewCommit?: string
  }[]
}

function emptyPlan(): WorkspaceStatusRulePlan {
  return {
    statusUpdates: [],
    removals: [],
    archives: [],
    creations: []
  }
}

function snapshotKey(repo: GitHubRepositoryIdentity, number: number): string {
  return `${repo.owner.toLowerCase()}/${repo.repo.toLowerCase()}#${number}`
}

function indexSnapshotPRs(
  pullRequests: readonly ReviewSnapshotPullRequest[]
): Map<string, ReviewSnapshotPullRequest> {
  return new Map(pullRequests.map((pr) => [snapshotKey(pr.repo, pr.number), pr]))
}

export function buildWorkspaceStatusRulePlan(args: {
  targets: readonly WorkspaceStatusRuleTarget[]
  snapshot: ReviewStatusSnapshot
  config: WorkspaceStatusRuleConfig
  /** Head branch names that already have a workspace, so the inbox never duplicates one. */
  existingBranches: ReadonlySet<string>
  maxCreations?: number
}): WorkspaceStatusRulePlan {
  const { targets, snapshot, config, existingBranches } = args
  const plan = emptyPlan()
  const pmTeamLogins = lowercaseLoginSet(snapshot.pmApprovalTeamLogins)
  const byKey = indexSnapshotPRs(snapshot.linkedPullRequests)
  const inboxKeys = new Set(
    snapshot.reviewRequestedPullRequests.map((pr) => snapshotKey(pr.repo, pr.number))
  )

  for (const target of targets) {
    const pr = byKey.get(snapshotKey(target.repo, target.prNumber))
    if (!pr) {
      continue
    }
    // Why before resolving anything: a holding lane owns its card for the whole run, and a pull
    // request opened mid-run must not move it, nor delete it when that pull request merges.
    if (target.isAutomationHeld === true) {
      continue
    }
    const { condition, status } = resolveWorkspaceStatusRule(
      pr,
      config,
      pmTeamLogins,
      snapshot.viewerLogin
    )
    const isResolved = condition === 'merged' || condition === 'closed'
    // Why the head check: a branch can resolve to a pull request it never was (an upstream tracking the
    // trunk finds an old PR whose head is the trunk), and deleting would discard the workspace's own work.
    if (isResolved && config.onResolved !== 'none' && target.headOid === pr.headRefOid) {
      ;(config.onResolved === 'archive' ? plan.archives : plan.removals).push({
        worktreeId: target.worktreeId,
        executionHostId: target.executionHostId,
        displayName: target.displayName
      })
      continue
    }
    if (
      condition === 'reviewing' &&
      config.onReviewed !== 'none' &&
      !target.hasPendingReviewComments &&
      readViewerReviewStanding(pr, snapshot.viewerLogin).isFinished
    ) {
      ;(config.onReviewed === 'archive' ? plan.archives : plan.removals).push({
        worktreeId: target.worktreeId,
        executionHostId: target.executionHostId,
        displayName: target.displayName,
        // Why conditional: the ledger is what stops the inbox re-creating a workspace it
        // already made, and forgetting a pull request still listed as owed this tick would
        // have it cloned straight back. A later re-request brings it back on its own.
        forgetHandledKey: inboxKeys.has(snapshotKey(pr.repo, pr.number))
          ? undefined
          : makeHandledPullRequestKey(pr.repo, pr.number)
      })
      continue
    }
    if (condition && status && status !== target.currentStatus) {
      plan.statusUpdates.push({
        worktreeId: target.worktreeId,
        executionHostId: target.executionHostId,
        status,
        condition
      })
    }
  }

  if (!config.reviewInbox.enabled) {
    return plan
  }
  const handled = new Set(config.handledPullRequests)
  const viewer = snapshot.viewerLogin?.toLowerCase() ?? null
  const linkedKeys = new Set(targets.map((target) => snapshotKey(target.repo, target.prNumber)))
  const maxCreations = args.maxCreations ?? MAX_REVIEW_INBOX_CREATES_PER_TICK

  for (const pr of snapshot.reviewRequestedPullRequests) {
    const standing = readViewerReviewStanding(pr, snapshot.viewerLogin)
    // Why the reviewed commit is part of the key: a re-request after a review is new work, and
    // keying on the pull request alone meant it was never cloned again once handled.
    const handledKey = makeHandledPullRequestKey(pr.repo, pr.number, standing.commitOid)
    if (handled.has(handledKey) || linkedKeys.has(snapshotKey(pr.repo, pr.number))) {
      continue
    }
    if (viewer && pr.author?.toLowerCase() === viewer) {
      continue
    }
    if (existingBranches.has(pr.headRefName)) {
      continue
    }
    if (plan.creations.length < maxCreations) {
      plan.creations.push({
        pr,
        handledKey,
        // Why only when a review exists: a first look wants the whole pull request, and a
        // re-request wants what the author changed in answer to it.
        sinceReviewCommit: standing.commitOid ?? undefined
      })
    }
  }
  return plan
}
