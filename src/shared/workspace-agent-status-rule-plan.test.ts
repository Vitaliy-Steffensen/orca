import { describe, expect, it } from 'vitest'
import { buildWorkspaceAgentStatusRulePlan } from './workspace-agent-status-rule-plan'
import type { WorkspaceAgentRuleTarget } from './workspace-agent-status-rule-plan'
import type { WorkspaceAgentObservation } from './workspace-agent-status-rules'
import {
  cloneDefaultWorkspaceStatusRuleConfig,
  DEFAULT_AGENT_RULE_DWELL_MS,
  type WorkspaceStatusRuleConfig
} from './workspace-status-rule-config'

const NOW = 10_000_000

function makeConfig(overrides: Partial<WorkspaceStatusRuleConfig> = {}): WorkspaceStatusRuleConfig {
  return {
    ...cloneDefaultWorkspaceStatusRuleConfig(),
    agentRulesEnabled: true,
    statusByAgentCondition: {
      'agent-blocked': 'answer-questions',
      'agent-asked': 'answer-questions',
      'agent-failed': 'flagged',
      'agent-idle-done': 'skim',
      'agent-working': 'implementing'
    },
    ...overrides
  }
}

function agent(overrides: Partial<WorkspaceAgentObservation> = {}): WorkspaceAgentObservation {
  return {
    state: 'working',
    hasQuestion: false,
    verdict: null,
    turnStartedAt: NOW - 60_000,
    ...overrides
  }
}

function makeTarget(overrides: Partial<WorkspaceAgentRuleTarget> = {}): WorkspaceAgentRuleTarget {
  return {
    worktreeId: 'repo::/w',
    executionHostId: 'local',
    currentStatus: 'autonomous',
    hasLinkedPullRequest: false,
    manualOverride: null,
    snapshot: { worktreeId: 'repo::/w', agents: [agent()] },
    ...overrides
  }
}

/** Two ticks a dwell apart: the first observes, the second moves. */
function runTwoTicks(target: WorkspaceAgentRuleTarget, config = makeConfig()) {
  const first = buildWorkspaceAgentStatusRulePlan({
    targets: [target],
    config,
    dwell: new Map(),
    now: NOW
  })
  const second = buildWorkspaceAgentStatusRulePlan({
    targets: [target],
    config,
    dwell: first.dwell,
    now: NOW + DEFAULT_AGENT_RULE_DWELL_MS
  })
  return { first, second }
}

describe('buildWorkspaceAgentStatusRulePlan', () => {
  it('does nothing while the rules are off', () => {
    const plan = buildWorkspaceAgentStatusRulePlan({
      targets: [makeTarget()],
      config: makeConfig({ agentRulesEnabled: false }),
      dwell: new Map(),
      now: NOW
    })

    expect(plan.statusUpdates).toEqual([])
    expect(plan.dwell.size).toBe(0)
  })

  it('holds a condition for the dwell before moving a card', () => {
    const { first, second } = runTwoTicks(
      makeTarget({ snapshot: { worktreeId: 'repo::/w', agents: [agent({ state: 'blocked' })] } })
    )

    expect(first.statusUpdates).toEqual([])
    expect(second.statusUpdates).toEqual([
      {
        worktreeId: 'repo::/w',
        executionHostId: 'local',
        status: 'answer-questions',
        condition: 'agent-blocked',
        markUnread: false
      }
    ])
  })

  it('restarts the dwell when the condition flickers', () => {
    const config = makeConfig()
    const blocked = makeTarget({
      snapshot: { worktreeId: 'repo::/w', agents: [agent({ state: 'blocked' })] }
    })
    const working = makeTarget()
    const first = buildWorkspaceAgentStatusRulePlan({
      targets: [blocked],
      config,
      dwell: new Map(),
      now: NOW
    })
    const second = buildWorkspaceAgentStatusRulePlan({
      targets: [working],
      config,
      dwell: first.dwell,
      now: NOW + DEFAULT_AGENT_RULE_DWELL_MS
    })

    expect(second.statusUpdates).toEqual([])
    expect(second.dwell.get('repo::/w')?.firstSeenAt).toBe(NOW + DEFAULT_AGENT_RULE_DWELL_MS)
  })

  it('moves a workspace only once for the same settled condition', () => {
    const target = makeTarget({
      snapshot: { worktreeId: 'repo::/w', agents: [agent({ state: 'blocked' })] }
    })
    const { second } = runTwoTicks(target)
    const third = buildWorkspaceAgentStatusRulePlan({
      targets: [target],
      config: makeConfig(),
      dwell: second.dwell,
      now: NOW + DEFAULT_AGENT_RULE_DWELL_MS * 2
    })

    expect(third.statusUpdates).toEqual([])
  })

  it('marks a failure unread', () => {
    const { second } = runTwoTicks(
      makeTarget({
        snapshot: {
          worktreeId: 'repo::/w',
          agents: [agent({ state: 'done', verdict: 'failed' })]
        }
      })
    )

    expect(second.statusUpdates[0]).toMatchObject({ status: 'flagged', markUnread: true })
  })

  it('yields the lane to a linked pull request', () => {
    const { second } = runTwoTicks(
      makeTarget({
        hasLinkedPullRequest: true,
        snapshot: { worktreeId: 'repo::/w', agents: [agent({ state: 'blocked' })] }
      })
    )

    expect(second.statusUpdates).toEqual([])
    expect(second.dwell.size).toBe(0)
  })

  it('never moves a card the user placed by hand', () => {
    const { second } = runTwoTicks(
      makeTarget({
        currentStatus: 'skim',
        manualOverride: { status: 'skim', at: NOW - 1_000 },
        snapshot: { worktreeId: 'repo::/w', agents: [agent({ state: 'blocked' })] }
      })
    )

    expect(second.statusUpdates).toEqual([])
    expect(second.clearedManualOverrides).toEqual([])
  })

  it('spends the override once a new turn starts, and clears it', () => {
    const { second } = runTwoTicks(
      makeTarget({
        currentStatus: 'skim',
        manualOverride: { status: 'skim', at: NOW - 120_000 },
        snapshot: {
          worktreeId: 'repo::/w',
          agents: [agent({ state: 'blocked', turnStartedAt: NOW - 1_000 })]
        }
      })
    )

    expect(second.clearedManualOverrides).toEqual([
      { worktreeId: 'repo::/w', executionHostId: 'local' }
    ])
    expect(second.statusUpdates[0]).toMatchObject({ status: 'answer-questions' })
  })

  it('spends an override the workspace has already been moved away from', () => {
    const { second } = runTwoTicks(
      makeTarget({
        currentStatus: 'autonomous',
        manualOverride: { status: 'skim', at: NOW - 1_000 },
        snapshot: { worktreeId: 'repo::/w', agents: [agent({ state: 'blocked' })] }
      })
    )

    expect(second.clearedManualOverrides).toHaveLength(1)
    expect(second.statusUpdates[0]).toMatchObject({ status: 'answer-questions' })
  })

  it('leaves a workspace already in the target lane alone', () => {
    const { second } = runTwoTicks(
      makeTarget({
        currentStatus: 'answer-questions',
        snapshot: { worktreeId: 'repo::/w', agents: [agent({ state: 'blocked' })] }
      })
    )

    expect(second.statusUpdates).toEqual([])
  })

  it('moves a workspace at most once in a tick', () => {
    const target = makeTarget({
      snapshot: {
        worktreeId: 'repo::/w',
        agents: [agent({ state: 'blocked' }), agent({ state: 'done', verdict: 'failed' })]
      }
    })
    const { second } = runTwoTicks(target)

    expect(second.statusUpdates).toHaveLength(1)
  })
})
