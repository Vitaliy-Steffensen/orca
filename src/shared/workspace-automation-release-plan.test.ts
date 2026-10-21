import { describe, expect, it } from 'vitest'
import { planAutomationReleases } from './workspace-automation-release-plan'
import type { AutomationReleaseTarget } from './workspace-automation-release-plan'

function target(overrides: Partial<AutomationReleaseTarget> = {}): AutomationReleaseTarget {
  return {
    worktreeId: 'wt-1',
    executionHostId: 'local',
    currentStatus: 'automation',
    isReleased: true,
    hasLinkedPullRequest: false,
    ...overrides
  }
}

describe('planAutomationReleases', () => {
  it('moves a finished run with no pull request to the release lane', () => {
    expect(planAutomationReleases([target()], 'implementing')).toEqual([
      { worktreeId: 'wt-1', executionHostId: 'local', status: 'implementing' }
    ])
  })

  it('leaves a run that is still going', () => {
    expect(planAutomationReleases([target({ isReleased: false })], 'implementing')).toEqual([])
  })

  it('leaves a workspace with a pull request to the pull request rules', () => {
    expect(
      planAutomationReleases([target({ hasLinkedPullRequest: true })], 'implementing')
    ).toEqual([])
  })

  it('does nothing when no release lane is configured', () => {
    expect(planAutomationReleases([target()], null)).toEqual([])
  })

  it('does not rewrite a workspace already in the release lane', () => {
    expect(
      planAutomationReleases([target({ currentStatus: 'implementing' })], 'implementing')
    ).toEqual([])
  })
})
