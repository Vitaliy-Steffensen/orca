import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { removeTreeSync } from '../../shared/windows-transient-lock-removal'
import { NO_REVIEW_SURFACE } from '../../shared/no-review-surface'
import { getAutomationKind, type Automation } from '../../shared/automations-types'
import type { Store } from '../persistence'
import { closeTestStores, createStore, testState } from '../persistence-test-harness'
import type { AutomationRendererChannel } from './automation-dispatch-request'
import { AutomationService } from './service'

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

function seedSync(store: Store): Automation {
  return store.createAutomation({
    kind: 'pull_request_sync',
    name: 'Pull request sync',
    prompt: '',
    agentId: 'claude',
    projectId: '',
    workspaceMode: 'existing',
    timezone: 'UTC',
    rrule: '* * * * *',
    dtstart: new Date('2026-05-13T08:00:00Z').getTime(),
    enabled: true,
    missedRunGraceMinutes: 5
  })
}

async function evaluateAt(
  store: Store,
  service: AutomationService,
  automationId: string,
  when: string
): Promise<void> {
  const nextRunAt = (): number | undefined =>
    store.listAutomations().find((entry) => entry.id === automationId)?.nextRunAt
  const before = nextRunAt()
  vi.setSystemTime(new Date(when))
  service.setRendererReady()
  await vi.waitFor(() => expect(nextRunAt()).toBeGreaterThan(before ?? 0))
}

describe('pull request sync schedule', () => {
  beforeEach(() => {
    testState.dir = mkdtempSync(join(tmpdir(), 'orca-pr-sync-schedule-'))
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-13T08:00:00Z'))
  })

  afterEach(async () => {
    await closeTestStores()
    vi.useRealTimers()
    removeTreeSync(testState.dir)
  })

  it('treats a missing kind as an agent prompt', () => {
    expect(getAutomationKind({})).toBe('agent_prompt')
    expect(getAutomationKind({ kind: 'pull_request_sync' })).toBe('pull_request_sync')
  })

  it('dispatches without a project and advances the next run', async () => {
    const store = await createStore()
    const automation = seedSync(store)
    const send = vi.fn()
    const channel: AutomationRendererChannel = {
      isDestroyed: () => false,
      send: (...args) => {
        send(...args)
      }
    }
    const service = new AutomationService(store, { tickMs: 60_000 })
    service.setWebContents(channel)

    const previousNextRunAt = automation.nextRunAt
    await evaluateAt(store, service, automation.id, '2026-05-13T08:02:00Z')

    expect(send).toHaveBeenCalled()
    const runs = store.listAutomationRuns(automation.id)
    expect(runs.some((run) => run.status === 'skipped_unavailable')).toBe(false)
    expect(
      store.listAutomations().find((entry) => entry.id === automation.id)?.nextRunAt
    ).toBeGreaterThan(previousNextRunAt)
  })

  it('refuses a headless host and folds the next refusal', async () => {
    const store = await createStore()
    const automation = seedSync(store)
    const dispatch = vi.fn()
    const service = new AutomationService(store, {
      tickMs: 60_000,
      headlessDispatcher: dispatch
    })

    vi.setSystemTime(new Date(automation.nextRunAt + 1_000))
    service.start()
    await vi.waitFor(() => expect(store.listAutomationRuns(automation.id)).toHaveLength(1))
    expect(dispatch).not.toHaveBeenCalled()
    expect(store.listAutomationRuns(automation.id)[0]).toMatchObject({
      status: 'skipped_unavailable',
      error: NO_REVIEW_SURFACE
    })

    const next = store.listAutomations().find((entry) => entry.id === automation.id)?.nextRunAt ?? 0
    service.stop()
    vi.setSystemTime(new Date(next + 1_000))
    service.start()
    await vi.waitFor(() =>
      expect(store.listAutomationRuns(automation.id)[0]?.occurrenceCount).toBe(2)
    )
    expect(store.listAutomationRuns(automation.id)).toHaveLength(1)
  })
})
