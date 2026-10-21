import type { WorkspaceStatus, WorkspaceStatusDefinition } from './worktree/types'

/**
 * The four lane flags answer one question each, and nothing reads them together:
 * `locked` decides what the user may choose, `autoFilled` what the lane admits to,
 * `holdsAutomation` whether a rule may move work out, `autoPull` whether the checkout
 * is kept at the pull request's head. A lane is ordinary when it carries none.
 */
export type WorkspaceStatusAutomationFlag = 'autoFilled' | 'locked' | 'holdsAutomation' | 'autoPull'

function findStatus(
  statuses: readonly WorkspaceStatusDefinition[],
  status: WorkspaceStatus | null | undefined
): WorkspaceStatusDefinition | undefined {
  return status ? statuses.find((entry) => entry.id === status) : undefined
}

export function hasWorkspaceStatusFlag(
  statuses: readonly WorkspaceStatusDefinition[],
  status: WorkspaceStatus | null | undefined,
  flag: WorkspaceStatusAutomationFlag
): boolean {
  return findStatus(statuses, status)?.[flag] === true
}

/** Lanes the user may choose by hand, in saved order. */
export function getManualWorkspaceStatuses(
  statuses: readonly WorkspaceStatusDefinition[]
): readonly WorkspaceStatusDefinition[] {
  return statuses.filter((status) => status.locked !== true)
}

/** Lanes automation owns, in saved order. Shown below the picker's separator, never chosen. */
export function getLockedWorkspaceStatuses(
  statuses: readonly WorkspaceStatusDefinition[]
): readonly WorkspaceStatusDefinition[] {
  return statuses.filter((status) => status.locked === true)
}

export function isLockedWorkspaceStatus(
  statuses: readonly WorkspaceStatusDefinition[],
  status: WorkspaceStatus | null | undefined
): boolean {
  return hasWorkspaceStatusFlag(statuses, status, 'locked')
}

/**
 * Whether a rule must leave this workspace where it is. A holding lane keeps its
 * card for as long as the work that put it there is still running, so a pull
 * request opened mid-run cannot pull it out before the run ends.
 */
export function isHeldByAutomation(
  statuses: readonly WorkspaceStatusDefinition[],
  status: WorkspaceStatus | null | undefined,
  isBusy: boolean
): boolean {
  return isBusy && hasWorkspaceStatusFlag(statuses, status, 'holdsAutomation')
}

export function isAutoPullWorkspaceStatus(
  statuses: readonly WorkspaceStatusDefinition[],
  status: WorkspaceStatus | null | undefined
): boolean {
  return hasWorkspaceStatusFlag(statuses, status, 'autoPull')
}
