import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { installWindowVisibilityTimeoutPoller } from '@/lib/window-visibility-timeout-poller'
import { getIndexedRepoMap } from '@/store/worktree-repo-index'
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

/** Matches the active-workspace review tier; a board does not change faster than this. */
const POLL_INTERVAL_MS = 60_000

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

async function runWorkspaceStatusRuleTick(): Promise<void> {
  const state = useAppStore.getState()
  const config = state.workspaceStatusRules
  if (!config.enabled || config.repoIds.length === 0) {
    return
  }
  await Promise.all(
    planNewWorkspaceStatusUpdates(
      collectNewWorkspaceStatusTargets(state, config.repoIds),
      config.newWorkspaceStatus,
      config.newWorkspaceStatusSince
    ).map((update) =>
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
  if (!scope.repoPath) {
    return
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
  await applyWorkspaceStatusRulePlan(plan, config)
  await launchConflictAgents(plan, scope.targets, snapshot, config)
  await runReviewEnteredCommands(plan, scope.targets, config)
  await syncReviewWorkspaceHeads(scope.targets, snapshot)
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
): Promise<void> {
  const syncs = planReviewHeadSyncs(
    collectReviewHeadSyncCandidates(useAppStore.getState(), targets),
    snapshot
  )
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
    }
  }
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

export function useWorkspaceStatusRulePoller(): void {
  const enabled = useAppStore(
    (state) => state.workspaceStatusRules.enabled && !isDevBuildWithoutOptIn()
  )

  useEffect(() => {
    if (!enabled) {
      return
    }
    return installWindowVisibilityTimeoutPoller({
      run: () =>
        runWorkspaceStatusRuleTick().catch((error) => {
          console.warn('[workspace-status-rules] tick failed:', error)
        }),
      getDelayMs: () => POLL_INTERVAL_MS
    })
  }, [enabled])
}
