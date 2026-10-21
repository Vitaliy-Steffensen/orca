import type { WorkspaceStatus, WorkspaceStatusDefinition } from './worktree/types'

/**
 * Puts the hold on exactly one lane. The flag is what makes a lane hold a run at all, so
 * choosing the lane in settings has to write it and choosing another has to take it back —
 * a lane left holding would keep cards no run of its own ever put there.
 */
export function applyAutomationHoldLane(
  statuses: readonly WorkspaceStatusDefinition[],
  laneId: WorkspaceStatus | null
): WorkspaceStatusDefinition[] {
  return statuses.map((status) => {
    const next = { ...status }
    delete next.holdsAutomation
    return status.id === laneId ? { ...next, holdsAutomation: true } : next
  })
}
