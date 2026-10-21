import type { TuiAgent } from './tui-agent'

/** Evaluation order. The first condition a pull request satisfies wins. */
export const WORKSPACE_STATUS_RULE_CONDITIONS = [
  'merged',
  'closed',
  'reviewing',
  'conflicts',
  'draft',
  'changes-requested',
  'merging',
  'approved',
  'pm-approval',
  'awaiting-review',
  'review'
] as const

export type WorkspaceStatusRuleCondition = (typeof WORKSPACE_STATUS_RULE_CONDITIONS)[number]

/** Evaluation order for the agent-state rules. The first condition a workspace's own
 *  main agents satisfy wins. Kept disjoint so the order only decides reporting, never
 *  which of two simultaneously true conditions is lost. */
export const WORKSPACE_AGENT_RULE_CONDITIONS = [
  'agent-blocked',
  'agent-asked',
  'agent-failed',
  'agent-idle-done',
  'agent-working'
] as const

export type WorkspaceAgentRuleCondition = (typeof WORKSPACE_AGENT_RULE_CONDITIONS)[number]

/** Default dwell: an agent state must hold this long before it moves a card. The activity
 *  dot may flicker between states within one turn; a lane that flickers is unreadable. */
export const DEFAULT_AGENT_RULE_DWELL_MS = 15_000

/** How the review agent's tab opens; 'default' follows the app's own default view. */
export type ReviewAgentView = 'chat' | 'terminal' | 'claude-web' | 'default'

export const REVIEW_AGENT_VIEWS: readonly ReviewAgentView[] = [
  'chat',
  'terminal',
  'claude-web',
  'default'
]

/** 'archive' shuts the workspace down and hides it; 'delete' removes the checkout. */
export type WorkspaceStatusRuleResolution = 'delete' | 'archive' | 'none'

/** The agent and model one top bar action runs on, so it can differ from the workspace's own chat. */
export type WorkspaceActionAgent = {
  agent: TuiAgent
  model?: string
  effort?: string
}

export const DEFAULT_REVIEW_PIPELINE_AGENT: WorkspaceActionAgent = {
  agent: 'grok',
  model: 'grok-4.7'
}
