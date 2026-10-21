import { isTuiAgent } from './tui-agent-config'
import {
  DEFAULT_REREVIEW_PROMPT_TEMPLATE,
  DEFAULT_REVIEW_PROMPT_TEMPLATE
} from './workspace-review-prompt-templates'
import {
  WORKSPACE_ACTION_PROMPT_IDS,
  type WorkspaceActionPromptId
} from './workspace-action-prompts'
import type { WorkspaceStatus } from './worktree/types'
import type {
  WorkspaceStatusRuleConfig,
  WorkspaceStatusRuleReviewInbox
} from './workspace-status-rule-config'
import {
  DEFAULT_AGENT_RULE_DWELL_MS,
  DEFAULT_REVIEW_PIPELINE_AGENT,
  REVIEW_AGENT_VIEWS,
  WORKSPACE_AGENT_RULE_CONDITIONS,
  WORKSPACE_STATUS_RULE_CONDITIONS,
  type WorkspaceActionAgent,
  type WorkspaceAgentRuleCondition,
  type WorkspaceStatusRuleCondition,
  type WorkspaceStatusRuleResolution
} from './workspace-status-rule-conditions'

/** 1 drops ledgers written by the removed seeding step, which recorded reviews
 *  as handled without ever cloning them. Re-cloning something that does have a
 *  workspace is already prevented by the linked-PR and branch checks. */
export const SEED_LEDGER_VERSION = 1

export const MAX_ACTION_PROMPT_LENGTH = 8000

const MIN_AGENT_RULE_DWELL_MS = 0
const MAX_AGENT_RULE_DWELL_MS = 10 * 60_000
const MAX_HANDLED_PULL_REQUESTS = 500
const MAX_ACTION_AGENT_FIELD_LENGTH = 200

export const DEFAULT_REVIEW_INBOX: WorkspaceStatusRuleReviewInbox = {
  enabled: false,
  agent: 'claude',
  view: 'chat',
  promptTemplate: DEFAULT_REVIEW_PROMPT_TEMPLATE,
  rereviewPromptTemplate: DEFAULT_REREVIEW_PROMPT_TEMPLATE
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : null
}

export function readResolution(value: unknown): WorkspaceStatusRuleResolution {
  // Why the explicit fallback: a config written by a newer build can name a
  // resolution this one has never heard of, and doing nothing is the safe read.
  return value === 'delete' || value === 'archive' ? value : 'none'
}

export function sanitizeString(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') {
    return fallback
  }
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : fallback
}

export function sanitizeStatusByCondition(
  value: unknown
): Partial<Record<WorkspaceStatusRuleCondition, WorkspaceStatus>> {
  const raw = asRecord(value)
  if (!raw) {
    return {}
  }
  const mapped: Partial<Record<WorkspaceStatusRuleCondition, WorkspaceStatus>> = {}
  for (const condition of WORKSPACE_STATUS_RULE_CONDITIONS) {
    const status = raw[condition]
    if (typeof status === 'string' && status.trim()) {
      mapped[condition] = status.trim()
    }
  }
  return mapped
}

export function sanitizeStatusByAgentCondition(
  value: unknown
): Partial<Record<WorkspaceAgentRuleCondition, WorkspaceStatus>> {
  const raw = asRecord(value)
  if (!raw) {
    return {}
  }
  const mapped: Partial<Record<WorkspaceAgentRuleCondition, WorkspaceStatus>> = {}
  for (const condition of WORKSPACE_AGENT_RULE_CONDITIONS) {
    const status = raw[condition]
    if (typeof status === 'string' && status.trim()) {
      mapped[condition] = status.trim()
    }
  }
  return mapped
}

export function sanitizeAgentRuleDwellMs(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_AGENT_RULE_DWELL_MS
  }
  return Math.min(Math.max(Math.round(value), MIN_AGENT_RULE_DWELL_MS), MAX_AGENT_RULE_DWELL_MS)
}

export function sanitizeNewWorkspaceStatus(
  status: unknown,
  since: unknown
): Pick<WorkspaceStatusRuleConfig, 'newWorkspaceStatus' | 'newWorkspaceStatusSince'> {
  if (typeof status !== 'string' || !status.trim()) {
    return { newWorkspaceStatus: null, newWorkspaceStatusSince: null }
  }
  return {
    newWorkspaceStatus: status.trim(),
    newWorkspaceStatusSince: typeof since === 'number' && Number.isFinite(since) ? since : null
  }
}

export function sanitizeReviewInbox(value: unknown): WorkspaceStatusRuleReviewInbox {
  const raw = asRecord(value)
  if (!raw) {
    return { ...DEFAULT_REVIEW_INBOX }
  }
  return {
    enabled: raw.enabled === true,
    agent: isTuiAgent(raw.agent) ? raw.agent : DEFAULT_REVIEW_INBOX.agent,
    view: REVIEW_AGENT_VIEWS.find((view) => view === raw.view) ?? DEFAULT_REVIEW_INBOX.view,
    promptTemplate:
      typeof raw.promptTemplate === 'string' && raw.promptTemplate.trim()
        ? raw.promptTemplate
        : DEFAULT_REVIEW_INBOX.promptTemplate,
    rereviewPromptTemplate:
      typeof raw.rereviewPromptTemplate === 'string' && raw.rereviewPromptTemplate.trim()
        ? raw.rereviewPromptTemplate
        : DEFAULT_REVIEW_INBOX.rereviewPromptTemplate
  }
}

export function sanitizeActionPrompts(
  value: unknown
): Partial<Record<WorkspaceActionPromptId, string>> {
  const raw = asRecord(value)
  const prompts: Partial<Record<WorkspaceActionPromptId, string>> = {}
  for (const id of WORKSPACE_ACTION_PROMPT_IDS) {
    const prompt = raw?.[id]
    if (typeof prompt === 'string' && prompt.trim()) {
      prompts[id] = prompt.slice(0, MAX_ACTION_PROMPT_LENGTH)
    }
  }
  return prompts
}

export function sanitizeActionAgents(
  value: unknown
): Partial<Record<WorkspaceActionPromptId, WorkspaceActionAgent>> {
  const raw = asRecord(value)
  const agents: Partial<Record<WorkspaceActionPromptId, WorkspaceActionAgent>> = {
    reviewPipeline: { ...DEFAULT_REVIEW_PIPELINE_AGENT }
  }
  for (const id of WORKSPACE_ACTION_PROMPT_IDS) {
    const entry = asRecord(raw?.[id])
    if (!entry || !isTuiAgent(entry.agent)) {
      continue
    }
    const model =
      typeof entry.model === 'string' && entry.model.trim()
        ? entry.model.trim().slice(0, MAX_ACTION_AGENT_FIELD_LENGTH)
        : undefined
    const effort =
      typeof entry.effort === 'string' && entry.effort.trim()
        ? entry.effort.trim().slice(0, MAX_ACTION_AGENT_FIELD_LENGTH)
        : undefined
    agents[id] = {
      agent: entry.agent,
      ...(model ? { model } : {}),
      ...(effort ? { effort } : {})
    }
  }
  return agents
}

export function sanitizeHandledPullRequests(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  const keys = value.filter((entry): entry is string => typeof entry === 'string' && !!entry.trim())
  // Why: newest keys matter most, so an overlong ledger drops its oldest entries.
  return [...new Set(keys)].slice(-MAX_HANDLED_PULL_REQUESTS)
}
