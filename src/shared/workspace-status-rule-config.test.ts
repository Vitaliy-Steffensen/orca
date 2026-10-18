import { describe, expect, it } from 'vitest'
import {
  cloneDefaultWorkspaceStatusRuleConfig,
  DEFAULT_AGENT_RULE_DWELL_MS,
  normalizeWorkspaceStatusRuleConfig
} from './workspace-status-rule-config'

describe('the reviewing view', () => {
  it('opens a review in Chat UI unless chosen otherwise', () => {
    expect(cloneDefaultWorkspaceStatusRuleConfig().reviewInbox.view).toBe('chat')
  })

  it.each(['chat', 'terminal', 'claude-web', 'default'] as const)('keeps %s', (view) => {
    const defaults = cloneDefaultWorkspaceStatusRuleConfig()
    const config = normalizeWorkspaceStatusRuleConfig({
      ...defaults,
      reviewInbox: { ...defaults.reviewInbox, view }
    })
    expect(config.reviewInbox.view).toBe(view)
  })

  it('falls back to Chat UI for an unknown value', () => {
    const defaults = cloneDefaultWorkspaceStatusRuleConfig()
    const config = normalizeWorkspaceStatusRuleConfig({
      ...defaults,
      reviewInbox: { ...defaults.reviewInbox, view: 'sideways' }
    })
    expect(config.reviewInbox.view).toBe('chat')
  })
})

describe('the conflict prompt template', () => {
  it('is empty, meaning the built-in prompt, until edited', () => {
    expect(cloneDefaultWorkspaceStatusRuleConfig().conflictPromptTemplate).toBe('')
  })

  it('keeps an edited template and drops a non-string one', () => {
    const defaults = cloneDefaultWorkspaceStatusRuleConfig()
    expect(
      normalizeWorkspaceStatusRuleConfig({
        ...defaults,
        conflictPromptTemplate: 'Merge {{baseRef}}'
      }).conflictPromptTemplate
    ).toBe('Merge {{baseRef}}')
    expect(
      normalizeWorkspaceStatusRuleConfig({ ...defaults, conflictPromptTemplate: 7 })
        .conflictPromptTemplate
    ).toBe('')
  })
})

describe('normalizeWorkspaceStatusRuleConfig', () => {
  it('keeps the command to run when a pull request enters Review, trimmed', () => {
    const config = normalizeWorkspaceStatusRuleConfig({
      ...cloneDefaultWorkspaceStatusRuleConfig(),
      reviewEnteredCommand: '  mise run bd  '
    })
    expect(config.reviewEnteredCommand).toBe('mise run bd')
  })

  it('has no Review command by default or for a non-string value', () => {
    expect(cloneDefaultWorkspaceStatusRuleConfig().reviewEnteredCommand).toBe('')
    expect(
      normalizeWorkspaceStatusRuleConfig({
        ...cloneDefaultWorkspaceStatusRuleConfig(),
        reviewEnteredCommand: 42
      }).reviewEnteredCommand
    ).toBe('')
  })

  it('discards a ledger written before the seeding step was removed', () => {
    const config = normalizeWorkspaceStatusRuleConfig({
      ...cloneDefaultWorkspaceStatusRuleConfig(),
      handledPullRequests: ['flowbasedk/flowbase#3170'],
      ledgerVersion: undefined
    })

    expect(config.handledPullRequests).toEqual([])
  })

  it('keeps a ledger written by this version', () => {
    const config = normalizeWorkspaceStatusRuleConfig({
      ...cloneDefaultWorkspaceStatusRuleConfig(),
      handledPullRequests: ['flowbasedk/flowbase#3170']
    })

    expect(config.handledPullRequests).toEqual(['flowbasedk/flowbase#3170'])
  })

  it('stamps the ledger version on a fresh config', () => {
    expect(normalizeWorkspaceStatusRuleConfig({}).ledgerVersion).toBe(1)
  })

  it('ignores the removed seeded flag without losing the rest', () => {
    const config = normalizeWorkspaceStatusRuleConfig({
      ...cloneDefaultWorkspaceStatusRuleConfig(),
      reviewInbox: { enabled: true, agent: 'claude', promptTemplate: 'x', seeded: true }
    })

    expect(config.reviewInbox.enabled).toBe(true)
    expect('seeded' in config.reviewInbox).toBe(false)
  })

  it('keeps the new-workspace column with the time it was chosen', () => {
    const config = normalizeWorkspaceStatusRuleConfig({
      newWorkspaceStatus: ' todo ',
      newWorkspaceStatusSince: 1_700_000_000_000
    })

    expect(config.newWorkspaceStatus).toBe('todo')
    expect(config.newWorkspaceStatusSince).toBe(1_700_000_000_000)
  })

  it('defaults agent rules to off with the built-in dwell', () => {
    const config = normalizeWorkspaceStatusRuleConfig({})

    expect(config.agentRulesEnabled).toBe(false)
    expect(config.statusByAgentCondition).toEqual({})
    expect(config.agentRuleDwellMs).toBe(DEFAULT_AGENT_RULE_DWELL_MS)
  })

  it('keeps only recognized agent conditions', () => {
    const config = normalizeWorkspaceStatusRuleConfig({
      agentRulesEnabled: true,
      statusByAgentCondition: { 'agent-failed': ' flagged ', 'agent-vibing': 'nowhere' }
    })

    expect(config.agentRulesEnabled).toBe(true)
    expect(config.statusByAgentCondition).toEqual({ 'agent-failed': 'flagged' })
  })

  it('clamps an out-of-range dwell', () => {
    expect(normalizeWorkspaceStatusRuleConfig({ agentRuleDwellMs: -5 }).agentRuleDwellMs).toBe(0)
    expect(
      normalizeWorkspaceStatusRuleConfig({ agentRuleDwellMs: 60 * 60_000 }).agentRuleDwellMs
    ).toBe(600_000)
    expect(normalizeWorkspaceStatusRuleConfig({ agentRuleDwellMs: 'soon' }).agentRuleDwellMs).toBe(
      DEFAULT_AGENT_RULE_DWELL_MS
    )
  })

  it('clears the new-workspace time when no column is chosen', () => {
    const config = normalizeWorkspaceStatusRuleConfig({
      newWorkspaceStatus: '',
      newWorkspaceStatusSince: 1_700_000_000_000
    })

    expect(config.newWorkspaceStatus).toBeNull()
    expect(config.newWorkspaceStatusSince).toBeNull()
  })
})
