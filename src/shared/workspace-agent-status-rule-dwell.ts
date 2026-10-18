import type { WorkspaceAgentRuleCondition } from './workspace-status-rule-config'

/** What a workspace's agent condition has been, and since when, across ticks. */
export type AgentRuleDwellEntry = {
  condition: WorkspaceAgentRuleCondition
  firstSeenAt: number
  /** The condition this workspace was last actually moved on, so a settled condition moves once. */
  appliedCondition?: WorkspaceAgentRuleCondition
}

export type AgentRuleDwellOutcome = {
  /** The entry to carry into the next tick; null drops the workspace from the tracker. */
  entry: AgentRuleDwellEntry | null
  /** The condition that has now held long enough and has not been applied yet. */
  settled: WorkspaceAgentRuleCondition | null
}

/** The dwell clock alone: it restarts whenever the condition changes and stops when there is none. */
export function trackAgentRuleDwell(
  previous: AgentRuleDwellEntry | null | undefined,
  condition: WorkspaceAgentRuleCondition | null,
  now: number
): AgentRuleDwellEntry | null {
  if (!condition) {
    return null
  }
  return previous?.condition === condition ? previous : { condition, firstSeenAt: now }
}

/**
 * Fold one observation into a workspace's dwell state. A condition must hold unchanged for
 * `dwellMs` before it settles, and settles only once: a condition already applied returns
 * null, which is what keeps a workspace from moving twice on the same state.
 */
export function advanceAgentRuleDwell(args: {
  previous: AgentRuleDwellEntry | null | undefined
  condition: WorkspaceAgentRuleCondition | null
  now: number
  dwellMs: number
}): AgentRuleDwellOutcome {
  const { previous, condition, now, dwellMs } = args
  const entry = trackAgentRuleDwell(previous, condition, now)
  if (!entry || !condition) {
    return { entry: null, settled: null }
  }
  if (entry.appliedCondition === condition || now - entry.firstSeenAt < dwellMs) {
    return { entry, settled: null }
  }
  return { entry: { ...entry, appliedCondition: condition }, settled: condition }
}
