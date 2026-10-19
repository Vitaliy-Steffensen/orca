import { toast } from 'sonner'
import { useAppStore } from '@/store'
import type { WorkspaceStatusRuleConfig } from '../../../../shared/workspace-status-rule-config'
import type { WorkspaceStatusRulePlan } from '../../../../shared/workspace-status-rule-plan'
import { createReviewWorkspace } from './create-review-workspace'
import { runArchiveWorktrees } from '../sidebar/archive-worktree-flow'
import { translate } from '@/i18n/i18n'

async function applyStatusUpdates(plan: WorkspaceStatusRulePlan): Promise<void> {
  const { updateWorktreeMeta } = useAppStore.getState()
  await Promise.all(
    plan.statusUpdates.map((update) =>
      updateWorktreeMeta(
        update.worktreeId,
        { workspaceStatus: update.status },
        { executionHostId: update.executionHostId }
      )
    )
  )
}

async function applyRemovals(plan: WorkspaceStatusRulePlan): Promise<number> {
  const { removeWorktree, forgetPullRequestHandled } = useAppStore.getState()
  const forget: string[] = []
  let removed = 0
  for (const removal of plan.removals) {
    // Why force stays off: Git refuses a checkout holding uncommitted work or a
    // live agent session, and that refusal is the safety net for an automatic
    // delete. The archive hook runs either way.
    const result = await removeWorktree(
      { id: removal.worktreeId, executionHostId: removal.executionHostId },
      false
    )
    if (!result.ok) {
      toast.error(
        translate('auto.components.workspaceStatusRules.kept', 'Kept {{name}}: {{reason}}', {
          name: removal.displayName,
          reason: result.error
        })
      )
      continue
    }
    // Why only after the workspace is actually gone: forgetting the key while the
    // checkout survives would have the inbox build a second one beside it.
    if (removal.forgetHandledKey) {
      forget.push(removal.forgetHandledKey)
    }
    removed += 1
  }
  if (forget.length > 0) {
    forgetPullRequestHandled(forget)
  }
  return removed
}

async function applyArchives(plan: WorkspaceStatusRulePlan): Promise<number> {
  if (plan.archives.length === 0) {
    return 0
  }
  const { forgetPullRequestHandled } = useAppStore.getState()
  // Why one batch: the teardown clears the active workspace once for the whole
  // set rather than flickering the content panel per archive.
  await runArchiveWorktrees(plan.archives.map((archive) => archive.worktreeId))
  const stillPresent = new Set(
    useAppStore
      .getState()
      .allWorktrees()
      .filter((worktree) => !worktree.isArchived)
      .map((worktree) => worktree.id)
  )
  const forget: string[] = []
  let archived = 0
  for (const archive of plan.archives) {
    if (stillPresent.has(archive.worktreeId)) {
      // Why no toast: runArchiveWorktrees already said what went wrong.
      continue
    }
    if (archive.forgetHandledKey) {
      forget.push(archive.forgetHandledKey)
    }
    archived += 1
  }
  if (forget.length > 0) {
    forgetPullRequestHandled(forget)
  }
  return archived
}

/** Why in memory and not the persisted ledger: a create that fails for a passing
 *  reason (a fetch that timed out, gh not yet authenticated) must not burn the
 *  pull request forever. Restarting Orca retries it. */
const failedCreateAttempts = new Map<string, number>()
const MAX_CREATE_ATTEMPTS = 3

async function applyCreations(
  plan: WorkspaceStatusRulePlan,
  config: WorkspaceStatusRuleConfig
): Promise<number> {
  let created = 0
  for (const creation of plan.creations) {
    const attempts = failedCreateAttempts.get(creation.handledKey) ?? 0
    if (attempts >= MAX_CREATE_ATTEMPTS) {
      continue
    }
    const result = await createReviewWorkspace(creation.pr, config, creation.sinceReviewCommit)
    if (result.ok) {
      created += 1
      failedCreateAttempts.delete(creation.handledKey)
      useAppStore.getState().markPullRequestHandled([creation.handledKey])
      toast.success(
        translate(
          'auto.components.workspaceStatusRules.reviewing',
          'Reviewing #{{number}} — {{title}}',
          {
            number: creation.pr.number,
            title: creation.pr.title
          }
        )
      )
      continue
    }
    failedCreateAttempts.set(creation.handledKey, attempts + 1)
    console.error(
      `[workspace-status-rules] review workspace for #${creation.pr.number} failed ` +
        `(attempt ${attempts + 1}/${MAX_CREATE_ATTEMPTS}):`,
      result.error
    )
    if (attempts + 1 >= MAX_CREATE_ATTEMPTS) {
      toast.error(
        translate(
          'auto.components.workspaceStatusRules.createFailed',
          'Could not open a review workspace for #{{number}}: {{reason}}',
          { number: creation.pr.number, reason: result.error }
        )
      )
    }
  }
  return created
}

export type WorkspaceStatusRuleApplyCounts = {
  statusUpdates: number
  removals: number
  archives: number
  creations: number
}

export async function applyWorkspaceStatusRulePlan(
  plan: WorkspaceStatusRulePlan,
  config: WorkspaceStatusRuleConfig
): Promise<WorkspaceStatusRuleApplyCounts> {
  await applyStatusUpdates(plan)
  const removals = await applyRemovals(plan)
  const archives = await applyArchives(plan)
  const creations = await applyCreations(plan, config)
  return {
    statusUpdates: plan.statusUpdates.length,
    removals,
    archives,
    creations
  }
}
