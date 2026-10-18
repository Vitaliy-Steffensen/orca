import { describe, expect, it } from 'vitest'
import {
  resolveAgentStatusRule,
  resolveAgentStatusRuleCondition,
  type WorkspaceAgentObservation
} from './workspace-agent-status-rules'
import { cloneDefaultWorkspaceStatusRuleConfig } from './workspace-status-rule-config'

function agent(overrides: Partial<WorkspaceAgentObservation> = {}): WorkspaceAgentObservation {
  return {
    state: 'working',
    hasQuestion: false,
    verdict: null,
    turnStartedAt: 1_000,
    ...overrides
  }
}

function snapshot(agents: WorkspaceAgentObservation[]) {
  return { worktreeId: 'repo::/w', agents }
}

describe('resolveAgentStatusRuleCondition', () => {
  it('reports nothing for a workspace with no agents', () => {
    expect(resolveAgentStatusRuleCondition(snapshot([]))).toBeNull()
  })

  it('reports a permission prompt as blocked', () => {
    expect(resolveAgentStatusRuleCondition(snapshot([agent({ state: 'blocked' })]))).toBe(
      'agent-blocked'
    )
  })

  it('reports a waiting agent as blocked', () => {
    expect(resolveAgentStatusRuleCondition(snapshot([agent({ state: 'waiting' })]))).toBe(
      'agent-blocked'
    )
  })

  it('reports a parked question separately from a permission prompt', () => {
    expect(
      resolveAgentStatusRuleCondition(snapshot([agent({ state: 'blocked', hasQuestion: true })]))
    ).toBe('agent-asked')
  })

  it('reports a failed turn', () => {
    expect(
      resolveAgentStatusRuleCondition(snapshot([agent({ state: 'done', verdict: 'failed' })]))
    ).toBe('agent-failed')
  })

  it('reports an interrupted turn as failed', () => {
    expect(
      resolveAgentStatusRuleCondition(snapshot([agent({ state: 'done', verdict: 'interrupted' })]))
    ).toBe('agent-failed')
  })

  it('does not treat an unprovable end as a failure', () => {
    expect(
      resolveAgentStatusRuleCondition(snapshot([agent({ state: 'done', verdict: 'unconfirmed' })]))
    ).toBe('agent-idle-done')
  })

  it('reports idle only when nothing is running', () => {
    expect(resolveAgentStatusRuleCondition(snapshot([agent({ state: 'done' }), agent()]))).toBe(
      'agent-working'
    )
    expect(
      resolveAgentStatusRuleCondition(
        snapshot([agent({ state: 'done' }), agent({ state: 'done' })])
      )
    ).toBe('agent-idle-done')
  })

  it('puts a question ahead of work another agent is still doing', () => {
    expect(
      resolveAgentStatusRuleCondition(
        snapshot([agent(), agent({ state: 'blocked', hasQuestion: true })])
      )
    ).toBe('agent-asked')
  })
})

describe('resolveAgentStatusRule', () => {
  it('moves nothing while agent rules are off', () => {
    const config = cloneDefaultWorkspaceStatusRuleConfig()
    config.statusByAgentCondition = { 'agent-blocked': 'needs-me' }

    expect(resolveAgentStatusRule(snapshot([agent({ state: 'blocked' })]), config)).toEqual({
      condition: null,
      status: null
    })
  })

  it('leaves an unmapped condition without a status', () => {
    const config = cloneDefaultWorkspaceStatusRuleConfig()
    config.agentRulesEnabled = true

    expect(resolveAgentStatusRule(snapshot([agent({ state: 'blocked' })]), config)).toEqual({
      condition: 'agent-blocked',
      status: null
    })
  })

  it('maps a configured condition to its lane', () => {
    const config = cloneDefaultWorkspaceStatusRuleConfig()
    config.agentRulesEnabled = true
    config.statusByAgentCondition = { 'agent-failed': 'flagged' }

    expect(
      resolveAgentStatusRule(snapshot([agent({ state: 'done', verdict: 'failed' })]), config)
    ).toEqual({ condition: 'agent-failed', status: 'flagged' })
  })
})
