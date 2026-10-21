import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { getIndexedAllWorktrees, getIndexedRepoMap } from '@/store/worktree-repo-index'
import { launchAgentBackgroundSession } from '@/lib/launch-agent-background-session'
import { resolveWorktreeBranchLabel } from '@/lib/worktree-default-display-name'
import { translate } from '@/i18n/i18n'
import { setGitHubHostedReviewAutoMerge } from '../right-sidebar/hosted-review-github-actions'
import type { GitHubRepositoryIdentity } from '../../../../shared/github/pull-request-types'
import type { ReviewSnapshotPullRequest } from '../../../../shared/github/review-status-snapshot-types'
import { decideAutoMergeAction } from '../../../../shared/auto-merge-decision'
import { buildAutoMergeCheckRepairPrompt } from '../../../../shared/auto-merge-check-repair-prompt'
import { appendValidationHostInstruction } from '../../../../shared/agent-validation-host-instruction'
import { renderConflictAgentPrompt } from '../../../../shared/workspace-status-rule-conflict-prompt'
import { buildReviewPromptVariables } from '../../../../shared/workspace-status-rule-prompt'
import { resolveAutoMergePolicy } from '../../../../shared/workspace-auto-merge-policy'
import { readCachedWorktreePR } from './collect-workspace-status-rule-targets'

// Why: the PR cache refreshes slower than the tick, so without this a still-stale cache re-sends the enable call.
const ENABLE_RETRY_INTERVAL_MS = 5 * 60_000
const lastEnableAttemptAt = new Map<string, number>()

function sameRepo(a: GitHubRepositoryIdentity, b: GitHubRepositoryIdentity): boolean {
  return (
    a.owner.toLowerCase() === b.owner.toLowerCase() && a.repo.toLowerCase() === b.repo.toLowerCase()
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export async function runAutoMergeTick(): Promise<void> {
  const state = useAppStore.getState()
  const repoMap = getIndexedRepoMap(state.repos)
  const targets = getIndexedAllWorktrees(state.worktreesByRepo).flatMap((worktree) => {
    const repo = repoMap.get(worktree.repoId)
    const branch = resolveWorktreeBranchLabel(worktree)
    const policy = resolveAutoMergePolicy(worktree)
    if (!repo || !branch || !policy.enabled || worktree.isArchived || worktree.isBare) {
      return []
    }
    const cachedPR = readCachedWorktreePR(state, repo, branch) ?? null
    if (!cachedPR?.prRepo) {
      return []
    }
    return [{ worktree, repo, policy, cachedPR, prRepo: cachedPR.prRepo }]
  })
  if (targets.length === 0) {
    return
  }
  const repos = targets.map((target) => target.repo)
  const repoPath = (repos.find((repo) => !repo.connectionId) ?? repos[0]).path
  const snapshot = await window.api.reviewStatusRules.snapshot({
    repoPath,
    linkedPullRequests: targets.map((t) => ({ repo: t.prRepo, number: t.cachedPR.number })),
    includeReviewInbox: false,
    reviewInboxRepos: [],
    pmApprovalTeam: null
  })
  const config = state.workspaceStatusRules
  for (const target of targets) {
    const { worktree, repo, policy, cachedPR, prRepo } = target
    const pr: ReviewSnapshotPullRequest | undefined = snapshot.linkedPullRequests.find(
      (entry) => entry.number === cachedPR.number && sameRepo(entry.repo, prRepo)
    )
    if (!pr) {
      continue
    }
    const decision = decideAutoMergeAction({ policy, pr, cachedPR })
    // Why: the board's own conflict rule launches its agent when it is on for this project.
    const action =
      decision.action === 'resolve-conflicts' &&
      config.resolveConflictsWithAgent &&
      config.repoIds.includes(repo.id)
        ? 'none'
        : decision.action
    try {
      if (action === 'resolve-conflicts') {
        await launchAgentBackgroundSession({
          agent: config.reviewInbox.agent,
          worktreeId: worktree.id,
          prompt: appendValidationHostInstruction(
            renderConflictAgentPrompt(config.conflictPromptTemplate, {
              ...buildReviewPromptVariables(pr),
              baseRef: pr.baseRefName,
              worktreePath: worktree.path
            }),
            state.settings?.validationHostInstruction
          ),
          launchSource: 'conflict_resolution',
          title: translate(
            'auto.components.workspaceStatusRules.conflictTabTitle',
            'Resolve conflicts #{{number}}',
            { number: pr.number }
          )
        })
      } else if (action === 'fix-checks') {
        await launchAgentBackgroundSession({
          agent: config.reviewInbox.agent,
          worktreeId: worktree.id,
          prompt: buildAutoMergeCheckRepairPrompt({
            prNumber: pr.number,
            repo: `${pr.repo.owner}/${pr.repo.repo}`,
            branch: pr.headRefName,
            headOid: pr.headRefOid,
            failingChecks: decision.failingChecks,
            worktreePath: worktree.path
          }),
          launchSource: 'check_repair',
          title: translate(
            'auto.components.workspaceStatusRules.checkRepairTabTitle',
            'Fix CI #{{number}}',
            { number: pr.number }
          )
        })
      } else if (action === 'enable-auto-merge') {
        const last = lastEnableAttemptAt.get(worktree.id) ?? 0
        if (Date.now() - last >= ENABLE_RETRY_INTERVAL_MS) {
          lastEnableAttemptAt.set(worktree.id, Date.now())
          const result = await setGitHubHostedReviewAutoMerge({
            repo,
            prNumber: pr.number,
            enabled: true,
            method: policy.method ?? 'squash',
            prRepo
          })
          if (!result.ok) {
            console.warn(
              '[auto-merge] could not enable GitHub auto-merge:',
              worktree.id,
              result.error
            )
          }
        }
      }
    } catch (error) {
      toast.error(
        translate(
          'auto.components.workspaceStatusRules.autoMergeActionFailed',
          'Auto-merge could not act on {{name}}: {{reason}}',
          { name: worktree.displayName, reason: errorMessage(error) }
        )
      )
      continue
    }
    const attemptsChanged = JSON.stringify(decision.attempts) !== JSON.stringify(policy.attempts)
    if (attemptsChanged) {
      // Why re-read: the user may have flipped a toggle while the tick awaited.
      const latest = resolveAutoMergePolicy(
        useAppStore.getState().getKnownWorktreeById(worktree.id)
      )
      await state.updateWorktreeMeta(worktree.id, {
        autoMerge: { ...latest, attempts: decision.attempts }
      })
    }
  }
}
