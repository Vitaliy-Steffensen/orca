import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { removeTreeSync } from '../../shared/windows-transient-lock-removal'
import { PULL_REQUEST_SYNC_NO_OP_TEXT } from '../../shared/pull-request-sync-summary'
import type { Automation, AutomationRunOutputSnapshot } from '../../shared/automations-types'
import type { Store } from '../persistence'
import { closeTestStores, createStore, testState } from '../persistence-test-harness'

vi.mock('electron', () => ({
  app: {
    getPath: () => testState.dir
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (plaintext: string) => Buffer.from(`encrypted:${plaintext}`, 'utf-8'),
    decryptString: (ciphertext: Buffer) => ciphertext.toString('utf-8').slice('encrypted:'.length)
  }
}))

function snapshot(content: string): AutomationRunOutputSnapshot {
  return { format: 'plain_text', content, capturedAt: 1, truncated: false }
}

function seed(store: Store): Automation {
  return store.createAutomation({
    kind: 'pull_request_sync',
    name: 'Pull request sync',
    prompt: '',
    agentId: 'claude',
    projectId: '',
    workspaceMode: 'existing',
    timezone: 'UTC',
    rrule: '* * * * *',
    dtstart: 1,
    enabled: true,
    missedRunGraceMinutes: 5
  })
}

describe('pull request sync no-op folding', () => {
  beforeEach(() => {
    testState.dir = mkdtempSync(join(tmpdir(), 'orca-pr-sync-noop-'))
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-13T08:00:00Z'))
  })

  afterEach(async () => {
    await closeTestStores()
    vi.useRealTimers()
    removeTreeSync(testState.dir)
  })

  it('folds three empty scheduled completions and starts a new row after a change', async () => {
    const store = await createStore()
    const automation = seed(store)
    const noOp = snapshot(PULL_REQUEST_SYNC_NO_OP_TEXT)

    const first = store.createAutomationRun(automation, 1_000)
    store.updateAutomationRun({ runId: first.id, status: 'completed', outputSnapshot: noOp })

    vi.setSystemTime(new Date('2026-05-13T08:01:00Z'))
    const second = store.createAutomationRun(automation, 2_000)
    expect(
      store.recordRepeatedNoOpRun({ runId: second.id, status: 'completed', outputSnapshot: noOp })
        ?.occurrenceCount
    ).toBe(2)

    vi.setSystemTime(new Date('2026-05-13T08:02:00Z'))
    const third = store.createAutomationRun(automation, 3_000)
    expect(
      store.recordRepeatedNoOpRun({ runId: third.id, status: 'completed', outputSnapshot: noOp })
        ?.occurrenceCount
    ).toBe(3)
    expect(store.listAutomationRuns(automation.id)).toHaveLength(1)

    vi.setSystemTime(new Date('2026-05-13T08:03:00Z'))
    const changed = store.createAutomationRun(automation, 4_000)
    const opened = snapshot('1 review opened')
    expect(
      store.recordRepeatedNoOpRun({
        runId: changed.id,
        status: 'completed',
        outputSnapshot: opened
      })
    ).toBeNull()
    store.updateAutomationRun({ runId: changed.id, status: 'completed', outputSnapshot: opened })
    expect(store.listAutomationRuns(automation.id)).toHaveLength(2)

    vi.setSystemTime(new Date('2026-05-13T08:04:00Z'))
    const afterChange = store.createAutomationRun(automation, 5_000)
    expect(
      store.recordRepeatedNoOpRun({
        runId: afterChange.id,
        status: 'completed',
        outputSnapshot: noOp
      })
    ).toBeNull()
    expect(store.listAutomationRuns(automation.id)).toHaveLength(3)
  })

  it('does not fold a manual run', async () => {
    const store = await createStore()
    const automation = seed(store)
    const noOp = snapshot(PULL_REQUEST_SYNC_NO_OP_TEXT)
    const first = store.createAutomationRun(automation, 1_000)
    store.updateAutomationRun({ runId: first.id, status: 'completed', outputSnapshot: noOp })
    vi.setSystemTime(new Date('2026-05-13T08:01:00Z'))
    const manual = store.createAutomationRun(automation, 2_000, 'manual')
    expect(
      store.recordRepeatedNoOpRun({ runId: manual.id, status: 'completed', outputSnapshot: noOp })
    ).toBeNull()
    expect(store.listAutomationRuns(automation.id)).toHaveLength(2)
  })
})
