import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { launchAgentBackgroundSession } from '@/lib/launch-agent-background-session'
import { translate } from '@/i18n/i18n'
import type { ReviewStatusSnapshot } from '../../../../shared/github/review-status-snapshot-types'
import type { WorkspaceStatusRuleConfig } from '../../../../shared/workspace-status-rule-config'
import type {
  WorkspaceStatusRulePlan,
  WorkspaceStatusRuleTarget
} from '../../../../shared/workspace-status-rule-plan'
import { renderConflictAgentPrompt } from '../../../../shared/workspace-status-rule-conflict-prompt'
import { buildReviewPromptVariables } from '../../../../shared/workspace-status-rule-prompt'

export async function launchConflictAgents(
  plan: WorkspaceStatusRulePlan,
  targets: readonly WorkspaceStatusRuleTarget[],
  snapshot: Pick<ReviewStatusSnapshot, 'linkedPullRequests'>,
  config: WorkspaceStatusRuleConfig
): Promise<number> {
  if (!config.resolveConflictsWithAgent) {
    return 0
  }
  let launched = 0
  // Why only on entering the column: a status update fires when the column changes, so a card already in Conflicts never relaunches.
  for (const update of plan.statusUpdates) {
    if (update.condition !== 'conflicts') {
      continue
    }
    const target = targets.find((entry) => entry.worktreeId === update.worktreeId)
    const pr = target
      ? snapshot.linkedPullRequests.find(
          (entry) =>
            entry.number === target.prNumber &&
            entry.repo.owner.toLowerCase() === target.repo.owner.toLowerCase() &&
            entry.repo.repo.toLowerCase() === target.repo.repo.toLowerCase()
        )
      : undefined
    const worktree = useAppStore.getState().getKnownWorktreeById(update.worktreeId)
    if (!target || !pr || !worktree) {
      continue
    }
    try {
      await launchAgentBackgroundSession({
        agent: config.reviewInbox.agent,
        worktreeId: worktree.id,
        prompt: renderConflictAgentPrompt(config.conflictPromptTemplate, {
          ...buildReviewPromptVariables(pr),
          baseRef: pr.baseRefName,
          worktreePath: worktree.path
        }),
        launchSource: 'conflict_resolution',
        title: translate(
          'auto.components.workspaceStatusRules.conflictTabTitle',
          'Resolve conflicts #{{number}}',
          { number: pr.number }
        )
      })
      launched += 1
    } catch (error) {
      toast.error(
        translate(
          'auto.components.workspaceStatusRules.conflictAgentFailed',
          'Could not start an agent for the conflicts in {{name}}: {{reason}}',
          {
            name: target.displayName,
            reason: error instanceof Error ? error.message : String(error)
          }
        )
      )
    }
  }
  return launched
}
