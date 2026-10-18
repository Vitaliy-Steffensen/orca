import type { AgentStatusState } from './agent-status-types'
import type {
  WorkspaceAgentRuleCondition,
  WorkspaceStatusRuleConfig
} from './workspace-status-rule-config'
import type { WorkspaceStatus } from './worktree/types'

/**
 * One main agent in a workspace, as the hook server reported it. Subagent and child-work
 * rows never appear here: a teammate asking its coordinator a question is not the user's
 * attention to give, so it must not move a lane.
 */
export type WorkspaceAgentObservation = {
  /** The main agent's own state, not the row's combined state — live child work is not the agent. */
  state: AgentStatusState
  /** The agent parked on an explicit question (AskUserQuestion), not a permission prompt. */
  hasQuestion: boolean
  /** The recorded verdict on the agent's last finished turn. */
  verdict: 'failed' | 'interrupted' | 'unconfirmed' | null
  /** When the current turn began, for deciding whether a manual override has been spent. */
  turnStartedAt: number
}

export type WorkspaceAgentSnapshot = {
  worktreeId: string
  /** Empty when nothing was observed; a workspace with no agents is never moved. */
  agents: readonly WorkspaceAgentObservation[]
}

function isAwaitingUser(agent: WorkspaceAgentObservation): boolean {
  return agent.state === 'blocked' || agent.state === 'waiting'
}

/**
 * The agent-state counterpart of {@link resolveWorkspaceStatusRuleCondition}: a pure read of
 * one workspace's main agents. Null means nothing observed, which never moves a card.
 */
export function resolveAgentStatusRuleCondition(
  snapshot: WorkspaceAgentSnapshot
): WorkspaceAgentRuleCondition | null {
  if (snapshot.agents.length === 0) {
    return null
  }
  // Why the question split: both park the agent on the user, but only one carries a prompt
  // worth routing differently, so the two stay disjoint and the order below only reports.
  if (snapshot.agents.some((agent) => isAwaitingUser(agent) && !agent.hasQuestion)) {
    return 'agent-blocked'
  }
  if (snapshot.agents.some((agent) => isAwaitingUser(agent) && agent.hasQuestion)) {
    return 'agent-asked'
  }
  // Why 'unconfirmed' is excluded: an end Orca could not prove is not evidence of a failure,
  // and flagging it would park healthy workspaces on a verdict nobody can act on.
  if (
    snapshot.agents.some((agent) => agent.verdict === 'failed' || agent.verdict === 'interrupted')
  ) {
    return 'agent-failed'
  }
  // Why "nothing is running" and not just "one agent is done": a finished agent beside a
  // running one is a stage that has not ended, and the workspace still needs nothing.
  if (snapshot.agents.every((agent) => agent.state === 'done')) {
    return 'agent-idle-done'
  }
  return snapshot.agents.some((agent) => agent.state === 'working') ? 'agent-working' : null
}

export type WorkspaceAgentRuleOutcome = {
  condition: WorkspaceAgentRuleCondition | null
  /** Null when the condition is unmapped, so an incomplete config never moves a card. */
  status: WorkspaceStatus | null
}

export function resolveAgentStatusRule(
  snapshot: WorkspaceAgentSnapshot,
  config: Pick<WorkspaceStatusRuleConfig, 'agentRulesEnabled' | 'statusByAgentCondition'>
): WorkspaceAgentRuleOutcome {
  if (!config.agentRulesEnabled) {
    return { condition: null, status: null }
  }
  const condition = resolveAgentStatusRuleCondition(snapshot)
  return {
    condition,
    status: condition ? (config.statusByAgentCondition[condition] ?? null) : null
  }
}

/** Whether the agent condition is one the user has to answer before work resumes. */
export function isAgentRuleAttentionCondition(condition: WorkspaceAgentRuleCondition): boolean {
  return condition === 'agent-blocked' || condition === 'agent-asked'
}
