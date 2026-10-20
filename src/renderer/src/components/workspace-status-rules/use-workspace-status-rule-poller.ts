import { useAppStore } from '@/store'
import { getIndexedRepoMap } from '@/store/worktree-repo-index'
import {
  emptyPullRequestSyncTickSummary,
  type PullRequestSyncTickSummary
} from '../../../../shared/pull-request-sync-summary'
import type { GitHubRepositoryIdentity } from '../../../../shared/github/pull-request-types'
import type { ReviewStatusSnapshot } from '../../../../shared/github/review-status-snapshot-types'
import { buildWorkspaceStatusRulePlan } from '../../../../shared/workspace-status-rule-plan'
import { applyWorkspaceStatusRulePlan } from './apply-workspace-status-rule-plan'
import {
  collectNewWorkspaceStatusTargets,
  collectReviewHeadSyncCandidates,
  collectWorkspaceStatusRuleScope
} from './collect-workspace-status-rule-targets'
import { planReviewHeadSyncs } from '../../../../shared/github/review-head-sync'
import { setPullRequestAuthors } from './pr-author-store'
import { setViewerReviewRequests } from './viewer-review-request-store'
import {
  readViewerReviewRequest,
  type ViewerReviewRequest
} from '../../../../shared/github/viewer-review-request'
import { readViewerReviewStanding } from '../../../../shared/workspace-status-rules'
import { launchConflictAgents } from './launch-conflict-agents'
import { runReviewEnteredCommands } from './run-review-entered-commands'
import { planNewWorkspaceStatusUpdates } from '../../../../shared/workspace-new-status-plan'
import { loadPendingReviewDrafts } from '../pending-review/pending-review-draft-store'
import { runWorkspaceAgentRuleTick } from './run-workspace-agent-rule-tick'
import { collectAutomationHoldScope } from './collect-automation-hold-targets'
import { planAutomationReleases } from '../../../../shared/workspace-automation-release-plan'

const slugCache = new Map<string, GitHubRepositoryIdentity>()

async function resolveScopedRepoSlugs(
  repoIds: readonly string[]
): Promise<GitHubRepositoryIdentity[]> {
  const repoMap = getIndexedRepoMap(useAppStore.getState().repos)
  const slugs: GitHubRepositoryIdentity[] = []
  for (const repoId of repoIds) {
    const repo = repoMap.get(repoId)
    if (!repo) {
      continue
    }
    // Why a failure is not cached: a lookup that fails once (offline, gh not yet
    // authenticated) would otherwise disable the review inbox until a restart.
    const slug =
      slugCache.get(repoId) ??
      (await window.api.gh.repoSlug({ repoPath: repo.path, repoId }).catch(() => null))
    if (slug) {
      slugCache.set(repoId, slug)
      slugs.push(slug)
    }
  }
  return slugs
}

export async function runWorkspaceStatusRuleTick(): Promise<PullRequestSyncTickSummary> {
  const empty = emptyPullRequestSyncTickSummary()
  if (isDevBuildWithoutOptIn()) {
    return empty
  }
  const state = useAppStore.getState()
  const config = state.workspaceStatusRules
  if (config.repoIds.length === 0) {
    return empty
  }
  const newStatusUpdates = planNewWorkspaceStatusUpdates(
    collectNewWorkspaceStatusTargets(state, config.repoIds),
    config.newWorkspaceStatus,
    config.newWorkspaceStatusSince
  )
  await Promise.all(
    newStatusUpdates.map((update) =>
      state.updateWorktreeMeta(
        update.worktreeId,
        { workspaceStatus: update.status },
        { executionHostId: update.executionHostId }
      )
    )
  )
  // Why awaited: the reviewed-removal guard reads the queue, and one still loading would read as
  // empty and let a workspace with unsent comments be deleted.
  await loadPendingReviewDrafts()
  const scope = collectWorkspaceStatusRuleScope(state, config.repoIds)
  const holds = collectAutomationHoldScope({
    state,
    repoIds: config.repoIds,
    workspaceStatuses: state.workspaceStatuses,
    pullRequestWorktreeIds: new Set(scope.targets.map((target) => target.worktreeId)),
    now: Date.now()
  })
  for (const target of scope.targets) {
    target.isAutomationHeld = holds.heldWorktreeIds.has(target.worktreeId)
  }
  const releases = planAutomationReleases(holds.releaseTargets, config.automationReleaseStatus)
  await Promise.all(
    releases.map((release) =>
      state.updateWorktreeMeta(
        release.worktreeId,
        { workspaceStatus: release.status },
        { executionHostId: release.executionHostId }
      )
    )
  )
  // Why before the repoPath guard: agent rules need no GitHub call, and a project with no
  // local checkout for `gh` to run in still has workspaces whose agents move lanes.
  await runWorkspaceAgentRuleTick(new Set(scope.targets.map((target) => target.worktreeId)))
  if (!scope.repoPath) {
    return { ...empty, statusUpdates: newStatusUpdates.length + releases.length }
  }
  const snapshot = await window.api.reviewStatusRules.snapshot({
    repoPath: scope.repoPath,
    linkedPullRequests: scope.linkedPullRequests,
    includeReviewInbox: config.reviewInbox.enabled,
    reviewInboxRepos: config.reviewInbox.enabled
      ? await resolveScopedRepoSlugs(config.repoIds)
      : [],
    pmApprovalTeam: config.pmApprovalTeam
  })
  publishLinkedPullRequestFacts(scope.targets, snapshot)
  const plan = buildWorkspaceStatusRulePlan({
    targets: scope.targets,
    snapshot,
    config,
    existingBranches: scope.existingBranches
  })
  const applied = await applyWorkspaceStatusRulePlan(plan, config)
  const conflictAgents = await launchConflictAgents(plan, scope.targets, snapshot, config)
  await runReviewEnteredCommands(plan, scope.targets, config)
  const headSyncs = await syncReviewWorkspaceHeads(scope.targets, snapshot)
  return {
    statusUpdates: newStatusUpdates.length + releases.length + applied.statusUpdates,
    creations: applied.creations,
    removals: applied.removals,
    archives: applied.archives,
    conflictAgents,
    headSyncs
  }
}

/** Per-workspace facts the sidebar reads straight off the tick, outside the worktree store. */
function publishLinkedPullRequestFacts(
  targets: readonly { worktreeId: string; prNumber: number; repo: GitHubRepositoryIdentity }[],
  snapshot: ReviewStatusSnapshot
): void {
  const authors = new Map<string, string>()
  const reviewRequests = new Map<string, ViewerReviewRequest>()
  for (const target of targets) {
    const pr = snapshot.linkedPullRequests.find(
      (candidate) =>
        candidate.number === target.prNumber &&
        candidate.repo.owner.toLowerCase() === target.repo.owner.toLowerCase() &&
        candidate.repo.repo.toLowerCase() === target.repo.repo.toLowerCase()
    )
    if (!pr) {
      continue
    }
    if (pr.author) {
      authors.set(target.worktreeId, pr.author)
    }
    const request = readViewerReviewRequest(pr, snapshot.viewerLogin)
    // Why the standing check: once the verdict is in, the question has been answered;
    // a re-request puts the viewer back on the hook with a clock of its own.
    if (request && !readViewerReviewStanding(pr, snapshot.viewerLogin).isFinished) {
      reviewRequests.set(target.worktreeId, request)
    }
  }
  setPullRequestAuthors(authors)
  setViewerReviewRequests(reviewRequests)
}

async function syncReviewWorkspaceHeads(
  targets: Parameters<typeof collectReviewHeadSyncCandidates>[1],
  snapshot: Parameters<typeof planReviewHeadSyncs>[1]
): Promise<number> {
  const syncs = planReviewHeadSyncs(
    collectReviewHeadSyncCandidates(useAppStore.getState(), targets),
    snapshot
  )
  let synced = 0
  // Why one at a time: each is a fetch and a reset in a different checkout of the same repository.
  for (const { worktreeId, ...request } of syncs) {
    const result = await window.api.reviewStatusRules
      .syncReviewHead(request)
      .catch((error: unknown) => {
        console.warn('[workspace-status-rules] review head sync failed:', worktreeId, error)
        return null
      })
    if (result?.kind === 'skipped') {
      console.info(
        '[workspace-status-rules] kept review workspace as is:',
        worktreeId,
        result.reason
      )
      continue
    }
    if (result?.kind === 'updated') {
      synced += 1
    }
  }
  return synced
}

const DEV_OPT_IN_STORAGE_KEY = 'orca.devStatusRules'

// Why off in dev builds: they share the workspace folder and GitHub account with the installed app, so
// both would act on the same review request and whichever ticks first runs the agent where you can't see it.
function isDevBuildWithoutOptIn(): boolean {
  if (!import.meta.env.DEV) {
    return false
  }
  try {
    return window.localStorage.getItem(DEV_OPT_IN_STORAGE_KEY) !== '1'
  } catch {
    return true
  }
}
