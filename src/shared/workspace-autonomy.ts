/**
 * Per-workspace clearance: does work in this workspace run unattended, or does it stop at the
 * scoping gate? Stages read it to branch; it is deliberately never synced to an issue tracker.
 */
export const WORKSPACE_AUTONOMY_VALUES = ['autonomous', 'supervised'] as const

export type WorkspaceAutonomy = (typeof WORKSPACE_AUTONOMY_VALUES)[number]

/** Unset reads as supervised: the safe default is the one that asks. */
export const DEFAULT_WORKSPACE_AUTONOMY: WorkspaceAutonomy = 'supervised'

export function isWorkspaceAutonomyValue(value: unknown): value is WorkspaceAutonomy {
  return WORKSPACE_AUTONOMY_VALUES.some((entry) => entry === value)
}

export function resolveWorkspaceAutonomy(value: unknown): WorkspaceAutonomy {
  return isWorkspaceAutonomyValue(value) ? value : DEFAULT_WORKSPACE_AUTONOMY
}

export function isAutonomousWorkspace(
  workspace: { workspaceAutonomy?: unknown } | null | undefined
): boolean {
  return resolveWorkspaceAutonomy(workspace?.workspaceAutonomy) === 'autonomous'
}
