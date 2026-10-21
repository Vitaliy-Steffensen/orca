import type { GitHubPRMergeMethod } from './github/pull-request-types'

export type WorkspaceAutoMergeAttempts = {
  headOid: string
  conflicts: number
  checks: number
}

export type WorkspaceAutoMergePolicy = {
  enabled: boolean
  resolveConflicts: boolean
  fixFailingChecks: boolean
  method?: GitHubPRMergeMethod
  /** Bookkeeping so a tick, or an app restart, never relaunches the same repair. */
  attempts?: WorkspaceAutoMergeAttempts
}

export const DEFAULT_AUTO_MERGE_POLICY: WorkspaceAutoMergePolicy = {
  enabled: true,
  resolveConflicts: true,
  fixFailingChecks: true
}

export const AUTO_MERGE_OFF_POLICY: WorkspaceAutoMergePolicy = {
  enabled: false,
  resolveConflicts: false,
  fixFailingChecks: false
}

export const MAX_CHECK_REPAIR_ATTEMPTS_PER_HEAD = 2

const MERGE_METHODS: readonly GitHubPRMergeMethod[] = ['merge', 'squash', 'rebase']

function nonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0
}

function normalizeAttempts(raw: unknown): WorkspaceAutoMergeAttempts | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined
  }
  const record: Record<string, unknown> = { ...raw }
  if (typeof record.headOid !== 'string' || !record.headOid) {
    return undefined
  }
  return {
    headOid: record.headOid,
    conflicts: nonNegativeInteger(record.conflicts),
    checks: nonNegativeInteger(record.checks)
  }
}

export function normalizeAutoMergePolicy(raw: unknown): WorkspaceAutoMergePolicy | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined
  }
  const record: Record<string, unknown> = { ...raw }
  const method = MERGE_METHODS.find((entry) => entry === record.method)
  const attempts = normalizeAttempts(record.attempts)
  return {
    enabled: record.enabled === true,
    resolveConflicts: record.resolveConflicts === true,
    fixFailingChecks: record.fixFailingChecks === true,
    ...(method ? { method } : {}),
    ...(attempts ? { attempts } : {})
  }
}

/** Absent reads as off; never read `worktree.autoMerge` raw. */
export function resolveAutoMergePolicy(
  worktree: { autoMerge?: unknown } | null | undefined
): WorkspaceAutoMergePolicy {
  return normalizeAutoMergePolicy(worktree?.autoMerge) ?? AUTO_MERGE_OFF_POLICY
}

/** Switching on turns all three on each time; the user can switch a repair back off afterwards. */
export function enableAutoMergePolicy(
  worktree: { autoMerge?: unknown } | null | undefined
): WorkspaceAutoMergePolicy {
  const stored = normalizeAutoMergePolicy(worktree?.autoMerge)
  return stored ? { ...stored, ...DEFAULT_AUTO_MERGE_POLICY } : DEFAULT_AUTO_MERGE_POLICY
}
