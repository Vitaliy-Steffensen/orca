import { describe, expect, it } from 'vitest'
import {
  formatPullRequestSyncTickSummary,
  PULL_REQUEST_SYNC_NO_OP_TEXT
} from './pull-request-sync-summary'

describe('formatPullRequestSyncTickSummary', () => {
  it('uses one fixed sentence when nothing changed', () => {
    expect(
      formatPullRequestSyncTickSummary({
        statusUpdates: 0,
        creations: 0,
        removals: 0,
        archives: 0,
        conflictAgents: 0,
        headSyncs: 0
      })
    ).toBe(PULL_REQUEST_SYNC_NO_OP_TEXT)
  })

  it('names the counts that changed', () => {
    expect(
      formatPullRequestSyncTickSummary({
        statusUpdates: 3,
        creations: 1,
        removals: 0,
        archives: 0,
        conflictAgents: 0,
        headSyncs: 0
      })
    ).toBe('3 workspaces moved, 1 review opened')
  })
})
