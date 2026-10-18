import type { ExecutionHostId } from './execution-host'
import {
  advanceAgentRuleDwell,
  trackAgentRuleDwell,
  type AgentRuleDwellEntry
} from './workspace-agent-status-rule-dwell'
import { resolveAgentStatusRule, type WorkspaceAgentSnapshot } from './workspace-agent-status-rules'
import {
  isManualWorkspaceStatusOverrideSpent,
  type WorkspaceStatusManualOverride
} from './workspace-status-manual-override'
import type {
  WorkspaceAgentRuleCondition,
  WorkspaceStatusRuleConfig
} from './workspace-status-rule-config'
import type { WorkspaceStatus } from './worktree/types'

/**
 * Who owns a lane when both rule families have something to say: once a workspace has a linked
 * pull request, the pull request wins. `changes-requested` and `merging` say where the work has
 * got to, which outranks "an agent is idle" — an agent finishing a turn on a pull request already
 * in review is not news about the stage. Before a pull request exists nothing competes, so agent
 * conditions are the only thing that can move the card. One constant, deliberately not a scatter
 * of conditions at the call sites.
 */
export const AGENT_RULES_YIELD_TO_LINKED_PULL_REQUEST = true

export type WorkspaceAgentRuleTarget = {
  worktreeId: string
  executionHostId: ExecutionHostId
  currentStatus: WorkspaceStatus | null
  /** True while a pull request is linked; see {@link AGENT_RULES_YIELD_TO_LINKED_PULL_REQUEST}. */
  hasLinkedPullRequest: boolean
  manualOverride: WorkspaceStatusManualOverride | null
  snapshot: WorkspaceAgentSnapshot
}

export type WorkspaceAgentRulePlan = {
  statusUpdates: {
    worktreeId: string
    executionHostId: ExecutionHostId
    status: WorkspaceStatus
    condition: WorkspaceAgentRuleCondition
    /** A failure is news the user has not seen, so the card carries an unread mark into its lane. */
    markUnread: boolean
  }[]
  /** Overrides the workspace has outlived, cleared so a later tick does not re-read them. */
  clearedManualOverrides: { worktreeId: string; executionHostId: ExecutionHostId }[]
  /** Dwell state to carry into the next tick, keyed by worktree id. */
  dwell: Map<string, AgentRuleDwellEntry>
}

export function buildWorkspaceAgentStatusRulePlan(args: {
  targets: readonly WorkspaceAgentRuleTarget[]
  config: WorkspaceStatusRuleConfig
  dwell: ReadonlyMap<string, AgentRuleDwellEntry>
  now: number
}): WorkspaceAgentRulePlan {
  const { targets, config, dwell, now } = args
  const plan: WorkspaceAgentRulePlan = {
    statusUpdates: [],
    clearedManualOverrides: [],
    dwell: new Map()
  }
  if (!config.enabled || !config.agentRulesEnabled) {
    return plan
  }

  for (const target of targets) {
    if (AGENT_RULES_YIELD_TO_LINKED_PULL_REQUEST && target.hasLinkedPullRequest) {
      continue
    }
    const { condition, status } = resolveAgentStatusRule(target.snapshot, config)
    const previous = dwell.get(target.worktreeId)
    const turnStartTimes = target.snapshot.agents.map((agent) => agent.turnStartedAt)
    const spentOverride =
      target.manualOverride &&
      isManualWorkspaceStatusOverrideSpent(
        target.manualOverride,
        target.currentStatus,
        turnStartTimes
      )
    if (target.manualOverride && !spentOverride) {
      const held = trackAgentRuleDwell(previous, condition, now)
      if (held) {
        plan.dwell.set(target.worktreeId, held)
      }
      continue
    }
    if (spentOverride) {
      plan.clearedManualOverrides.push({
        worktreeId: target.worktreeId,
        executionHostId: target.executionHostId
      })
    }
    const outcome = advanceAgentRuleDwell({
      previous,
      condition,
      now,
      dwellMs: config.agentRuleDwellMs
    })
    if (outcome.entry) {
      plan.dwell.set(target.worktreeId, outcome.entry)
    }
    if (!outcome.settled || !status || status === target.currentStatus) {
      continue
    }
    plan.statusUpdates.push({
      worktreeId: target.worktreeId,
      executionHostId: target.executionHostId,
      status,
      condition: outcome.settled,
      markUnread: outcome.settled === 'agent-failed'
    })
  }
  return plan
}
