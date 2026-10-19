import { describe, expect, it } from 'vitest'
import {
  PULL_REQUEST_SYNC_CREATION_KEY,
  readLegacyWorkspaceStatusRulesEnabled,
  seedPullRequestSyncAutomation
} from './pull-request-sync-seed'

function emptyState() {
  return { automations: [], seededAutomationCreationKeys: [] }
}

describe('pull request sync seed', () => {
  it('reads the old master switch only when it was true', () => {
    expect(
      readLegacyWorkspaceStatusRulesEnabled({ ui: { workspaceStatusRules: { enabled: true } } })
    ).toBe(true)
    expect(
      readLegacyWorkspaceStatusRulesEnabled({ ui: { workspaceStatusRules: { enabled: false } } })
    ).toBe(false)
    expect(readLegacyWorkspaceStatusRulesEnabled({})).toBe(false)
  })

  it('seeds once, keeps the old enabled flag, and does not recreate after deletion', () => {
    const first = seedPullRequestSyncAutomation(emptyState(), true)
    expect(first.changed).toBe(true)
    expect(first.state.automations).toHaveLength(1)
    expect(first.state.automations?.[0]).toMatchObject({
      kind: 'pull_request_sync',
      name: 'Pull request sync',
      enabled: true,
      creationKey: PULL_REQUEST_SYNC_CREATION_KEY,
      missedRunGraceMinutes: 5,
      rrule: '* * * * *'
    })

    const again = seedPullRequestSyncAutomation(first.state, false)
    expect(again.changed).toBe(false)
    expect(again.state.automations).toHaveLength(1)

    const deleted = {
      ...first.state,
      automations: []
    }
    const afterDelete = seedPullRequestSyncAutomation(deleted, true)
    expect(afterDelete.changed).toBe(false)
    expect(afterDelete.state.automations).toHaveLength(0)
  })
})
