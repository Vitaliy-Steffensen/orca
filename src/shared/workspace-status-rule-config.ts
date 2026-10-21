import type { WorkspaceStatus } from './worktree/types'
import type { TuiAgent } from './tui-agent'
import type { WorkspaceActionPromptId } from './workspace-action-prompts'
import {
  DEFAULT_AGENT_RULE_DWELL_MS,
  DEFAULT_REVIEW_PIPELINE_AGENT,
  type ReviewAgentView,
  type WorkspaceActionAgent,
  type WorkspaceAgentRuleCondition,
  type WorkspaceStatusRuleCondition,
  type WorkspaceStatusRuleResolution
} from './workspace-status-rule-conditions'
import {
  DEFAULT_REVIEW_INBOX,
  MAX_ACTION_PROMPT_LENGTH,
  SEED_LEDGER_VERSION,
  asRecord,
  readResolution,
  sanitizeActionAgents,
  sanitizeActionPrompts,
  sanitizeAgentRuleDwellMs,
  sanitizeHandledPullRequests,
  sanitizeNewWorkspaceStatus,
  sanitizeReviewInbox,
  sanitizeStatusByAgentCondition,
  sanitizeStatusByCondition,
  sanitizeString
} from './workspace-status-rule-sanitize'

export {
  DEFAULT_AGENT_RULE_DWELL_MS,
  DEFAULT_REVIEW_PIPELINE_AGENT,
  REVIEW_AGENT_VIEWS,
  WORKSPACE_AGENT_RULE_CONDITIONS,
  WORKSPACE_STATUS_RULE_CONDITIONS,
  type ReviewAgentView,
  type WorkspaceActionAgent,
  type WorkspaceAgentRuleCondition,
  type WorkspaceStatusRuleCondition,
  type WorkspaceStatusRuleResolution
} from './workspace-status-rule-conditions'
export {
  DEFAULT_REREVIEW_PROMPT_TEMPLATE,
  DEFAULT_REVIEW_PROMPT_TEMPLATE
} from './workspace-review-prompt-templates'

export type WorkspaceStatusRuleReviewInbox = {
  enabled: boolean
  agent: TuiAgent
  view: ReviewAgentView
  promptTemplate: string
  /** Used instead when the pull request comes back after a review you already sent. */
  rereviewPromptTemplate: string
}

export type WorkspaceStatusRuleConfig = {
  /** Projects the rules act on. Empty means the rules do nothing. */
  repoIds: string[]
  statusByCondition: Partial<Record<WorkspaceStatusRuleCondition, WorkspaceStatus>>
  /** Agent-state rules run beside the pull request rules; off leaves today's behaviour exactly. */
  agentRulesEnabled: boolean
  statusByAgentCondition: Partial<Record<WorkspaceAgentRuleCondition, WorkspaceStatus>>
  /** How long an agent condition must hold before it may move a card. */
  agentRuleDwellMs: number
  mergingCheckName: string
  /** Column a workspace Orca creates in a scoped project starts in, before any rule applies. */
  newWorkspaceStatus: WorkspaceStatus | null
  /** When `newWorkspaceStatus` was chosen; only workspaces created after it are moved. */
  newWorkspaceStatusSince: number | null
  /** Lane a workspace Orca launches an agent into, so the run is visible in one place while it lasts. */
  automationStartStatus: WorkspaceStatus | null
  /** Where a workspace with no pull request goes once its holding lane releases it. */
  automationReleaseStatus: WorkspaceStatus | null
  /** `org/team-slug`, or null when PM approval is not in use. */
  pmApprovalTeam: string | null
  /** What to do once a pull request is merged or closed without merging. */
  onResolved: WorkspaceStatusRuleResolution
  /** What to do once you have approved or requested changes on someone else's pull request. */
  onReviewed: WorkspaceStatusRuleResolution
  /** Starts an agent to merge the base branch and push when your pull request lands in Conflicts. */
  resolveConflictsWithAgent: boolean
  /** The conflict agent's prompt; empty uses the built-in one. */
  conflictPromptTemplate: string
  /** Shell command run in the workspace when your pull request lands in Review; empty runs nothing. */
  reviewEnteredCommand: string
  /** The top bar's action buttons; an empty or missing entry uses the built-in prompt. */
  actionPrompts: Partial<Record<WorkspaceActionPromptId, string>>
  /** Per-action agent override; an action without an entry runs on the review agent. */
  actionAgents: Partial<Record<WorkspaceActionPromptId, WorkspaceActionAgent>>
  reviewInbox: WorkspaceStatusRuleReviewInbox
  /** `owner/repo#number` keys already acted on, so a create never repeats. */
  handledPullRequests: string[]
  /** Bumped when the meaning of `handledPullRequests` changes; an older ledger is discarded. */
  ledgerVersion?: number
}

export const DEFAULT_MERGING_CHECK_NAME = 'Reviews satisfied'

const MAX_CHECK_NAME_LENGTH = 120
const MAX_TEAM_LENGTH = 120
const MAX_COMMAND_LENGTH = 1000

export function cloneDefaultWorkspaceStatusRuleConfig(): WorkspaceStatusRuleConfig {
  return {
    repoIds: [],
    statusByCondition: {},
    agentRulesEnabled: false,
    statusByAgentCondition: {},
    agentRuleDwellMs: DEFAULT_AGENT_RULE_DWELL_MS,
    mergingCheckName: DEFAULT_MERGING_CHECK_NAME,
    newWorkspaceStatus: null,
    newWorkspaceStatusSince: null,
    automationStartStatus: null,
    automationReleaseStatus: null,
    pmApprovalTeam: null,
    onResolved: 'none',
    onReviewed: 'none',
    resolveConflictsWithAgent: false,
    conflictPromptTemplate: '',
    reviewEnteredCommand: '',
    actionPrompts: {},
    actionAgents: { reviewPipeline: { ...DEFAULT_REVIEW_PIPELINE_AGENT } },
    reviewInbox: { ...DEFAULT_REVIEW_INBOX },
    handledPullRequests: [],
    ledgerVersion: SEED_LEDGER_VERSION
  }
}

export function makeHandledPullRequestKey(
  repo: { owner: string; repo: string },
  number: number,
  reviewedCommit?: string | null
): string {
  const key = `${repo.owner}/${repo.repo}#${number}`
  return reviewedCommit ? `${key}@${reviewedCommit}` : key
}

/** Whether a ledger entry belongs to this pull request, whichever review it was keyed on. */
export function isHandledKeyForPullRequest(entry: string, pullRequestKey: string): boolean {
  return entry === pullRequestKey || entry.startsWith(`${pullRequestKey}@`)
}

export function normalizeWorkspaceStatusRuleConfig(value: unknown): WorkspaceStatusRuleConfig {
  const defaults = cloneDefaultWorkspaceStatusRuleConfig()
  const raw = asRecord(value)
  if (!raw) {
    return defaults
  }
  const pmApprovalTeam =
    typeof raw.pmApprovalTeam === 'string' && raw.pmApprovalTeam.trim()
      ? raw.pmApprovalTeam.trim().slice(0, MAX_TEAM_LENGTH)
      : null
  return {
    repoIds: Array.isArray(raw.repoIds)
      ? [
          ...new Set(
            raw.repoIds.filter((id): id is string => typeof id === 'string' && !!id.trim())
          )
        ]
      : [],
    statusByCondition: sanitizeStatusByCondition(raw.statusByCondition),
    agentRulesEnabled: raw.agentRulesEnabled === true,
    statusByAgentCondition: sanitizeStatusByAgentCondition(raw.statusByAgentCondition),
    agentRuleDwellMs: sanitizeAgentRuleDwellMs(raw.agentRuleDwellMs),
    mergingCheckName: sanitizeString(
      raw.mergingCheckName,
      defaults.mergingCheckName,
      MAX_CHECK_NAME_LENGTH
    ),
    ...sanitizeNewWorkspaceStatus(raw.newWorkspaceStatus, raw.newWorkspaceStatusSince),
    automationStartStatus:
      typeof raw.automationStartStatus === 'string' && raw.automationStartStatus.trim()
        ? raw.automationStartStatus.trim()
        : null,
    automationReleaseStatus:
      typeof raw.automationReleaseStatus === 'string' && raw.automationReleaseStatus.trim()
        ? raw.automationReleaseStatus.trim()
        : null,
    pmApprovalTeam,
    onResolved: readResolution(raw.onResolved),
    onReviewed: readResolution(raw.onReviewed),
    resolveConflictsWithAgent: raw.resolveConflictsWithAgent === true,
    conflictPromptTemplate:
      typeof raw.conflictPromptTemplate === 'string'
        ? raw.conflictPromptTemplate.slice(0, MAX_ACTION_PROMPT_LENGTH)
        : '',
    reviewEnteredCommand:
      typeof raw.reviewEnteredCommand === 'string'
        ? raw.reviewEnteredCommand.trim().slice(0, MAX_COMMAND_LENGTH)
        : '',
    actionPrompts: sanitizeActionPrompts(raw.actionPrompts),
    actionAgents: sanitizeActionAgents(raw.actionAgents),
    reviewInbox: sanitizeReviewInbox(raw.reviewInbox),
    handledPullRequests:
      raw.ledgerVersion === SEED_LEDGER_VERSION
        ? sanitizeHandledPullRequests(raw.handledPullRequests)
        : [],
    ledgerVersion: SEED_LEDGER_VERSION
  }
}

export function parsePmApprovalTeam(value: string | null): { org: string; slug: string } | null {
  if (!value) {
    return null
  }
  const [org, slug] = value.split('/')
  return org?.trim() && slug?.trim() ? { org: org.trim(), slug: slug.trim() } : null
}
