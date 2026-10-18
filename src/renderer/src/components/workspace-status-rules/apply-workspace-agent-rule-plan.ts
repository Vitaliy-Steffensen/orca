import { useAppStore } from '@/store'
import type { WorkspaceAgentRulePlan } from '../../../../shared/workspace-agent-status-rule-plan'
import type { WorktreeMetaBatchUpdate } from '../../store/slices/worktree-helpers'

export async function applyWorkspaceAgentRulePlan(plan: WorkspaceAgentRulePlan): Promise<void> {
  const { updateWorktreesMeta, markWorktreeUnread } = useAppStore.getState()
  const updates = new Map<string, WorktreeMetaBatchUpdate>()
  for (const cleared of plan.clearedManualOverrides) {
    updates.set(cleared.worktreeId, {
      worktreeId: cleared.worktreeId,
      updates: { agentRuleManualOverride: undefined },
      executionHostId: cleared.executionHostId
    })
  }
  for (const update of plan.statusUpdates) {
    const existing = updates.get(update.worktreeId)
    updates.set(update.worktreeId, {
      worktreeId: update.worktreeId,
      updates: { ...existing?.updates, workspaceStatus: update.status },
      executionHostId: update.executionHostId
    })
  }
  if (updates.size === 0) {
    return
  }
  await updateWorktreesMeta([...updates.values()])
  for (const update of plan.statusUpdates) {
    if (update.markUnread) {
      markWorktreeUnread(update.worktreeId)
    }
  }
}
