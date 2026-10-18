import { useAppStore } from '@/store'
import type { AgentRuleDwellEntry } from '../../../../shared/workspace-agent-status-rule-dwell'
import { buildWorkspaceAgentStatusRulePlan } from '../../../../shared/workspace-agent-status-rule-plan'
import { applyWorkspaceAgentRulePlan } from './apply-workspace-agent-rule-plan'
import { collectWorkspaceAgentRuleTargets } from './collect-workspace-agent-rule-targets'

/** Dwell is tick-to-tick memory, not persisted state: a restart simply starts the clocks again. */
let dwellByWorktreeId: ReadonlyMap<string, AgentRuleDwellEntry> = new Map()

export function resetWorkspaceAgentRuleDwell(): void {
  dwellByWorktreeId = new Map()
}

export async function runWorkspaceAgentRuleTick(
  pullRequestWorktreeIds: ReadonlySet<string>
): Promise<void> {
  const state = useAppStore.getState()
  const config = state.workspaceStatusRules
  if (!config.agentRulesEnabled) {
    resetWorkspaceAgentRuleDwell()
    return
  }
  const now = Date.now()
  const plan = buildWorkspaceAgentStatusRulePlan({
    targets: collectWorkspaceAgentRuleTargets({
      state,
      repoIds: config.repoIds,
      pullRequestWorktreeIds,
      now
    }),
    config,
    dwell: dwellByWorktreeId,
    now
  })
  dwellByWorktreeId = plan.dwell
  await applyWorkspaceAgentRulePlan(plan)
}
