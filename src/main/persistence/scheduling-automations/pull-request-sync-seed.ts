import { randomUUID } from 'node:crypto'
import type { Automation } from '../../../shared/automations-types'
import { nextAutomationOccurrenceAfter } from '../../../shared/automation-schedule-occurrences'

/** Idempotency key for the upgrade seed. Also the tombstone, so deleting the record does not bring it back. */
export const PULL_REQUEST_SYNC_CREATION_KEY = 'orca.pull-request-sync'

export const PULL_REQUEST_SYNC_RRULE = '* * * * *'

function objectField(value: object, key: string): unknown {
  return Object.hasOwn(value, key) ? Reflect.get(value, key) : undefined
}

export function readLegacyWorkspaceStatusRulesEnabled(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') {
    return false
  }
  const ui = objectField(parsed, 'ui')
  if (!ui || typeof ui !== 'object') {
    return false
  }
  const rules = objectField(ui, 'workspaceStatusRules')
  if (!rules || typeof rules !== 'object') {
    return false
  }
  return objectField(rules, 'enabled') === true
}

type PullRequestSyncSeedState = {
  automations?: Automation[]
  seededAutomationCreationKeys?: string[]
}

function seededKeys(state: PullRequestSyncSeedState): string[] {
  return (state.seededAutomationCreationKeys ?? []).filter(
    (key): key is string => typeof key === 'string' && key.length > 0
  )
}

export function seedPullRequestSyncAutomation<T extends PullRequestSyncSeedState>(
  state: T,
  enabled: boolean
): { state: T; changed: boolean } {
  const keys = seededKeys(state)
  if (keys.includes(PULL_REQUEST_SYNC_CREATION_KEY)) {
    return { state, changed: false }
  }
  const alreadyPresent = (state.automations ?? []).some(
    (automation) =>
      automation.creationKey === PULL_REQUEST_SYNC_CREATION_KEY ||
      automation.kind === 'pull_request_sync'
  )
  const tombstone = [...keys, PULL_REQUEST_SYNC_CREATION_KEY]
  if (alreadyPresent) {
    return { state: { ...state, seededAutomationCreationKeys: tombstone }, changed: true }
  }
  const now = Date.now()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const automation: Automation = {
    id: randomUUID(),
    creationKey: PULL_REQUEST_SYNC_CREATION_KEY,
    kind: 'pull_request_sync',
    name: 'Pull request sync',
    prompt: '',
    precheck: null,
    agentId: 'claude',
    projectId: '',
    executionTargetType: 'local',
    executionTargetId: 'local',
    schedulerOwner: 'local_host_service',
    workspaceMode: 'existing',
    workspaceId: null,
    baseBranch: null,
    reuseSession: false,
    timezone,
    rrule: PULL_REQUEST_SYNC_RRULE,
    dtstart: now,
    enabled,
    nextRunAt: nextAutomationOccurrenceAfter(PULL_REQUEST_SYNC_RRULE, now, now),
    missedRunPolicy: 'run_once_within_grace',
    missedRunGraceMinutes: 5,
    createdAt: now,
    updatedAt: now
  }
  return {
    state: {
      ...state,
      automations: [...(state.automations ?? []), automation],
      seededAutomationCreationKeys: tombstone
    },
    changed: true
  }
}
