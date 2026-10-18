import type { WorkspaceAutonomy } from './workspace-autonomy'
import type { WorkspaceIntent } from './workspace-intent'

export const WORKSPACE_MODE_VALUES = ['ask', 'supervised', 'autonomous'] as const
export type WorkspaceMode = (typeof WORKSPACE_MODE_VALUES)[number]
export const DEFAULT_WORKSPACE_MODE: WorkspaceMode = 'supervised'

export function isWorkspaceModeValue(value: unknown): value is WorkspaceMode {
  return WORKSPACE_MODE_VALUES.some((entry) => entry === value)
}

export function resolveWorkspaceMode(value: unknown): WorkspaceMode {
  return isWorkspaceModeValue(value) ? value : DEFAULT_WORKSPACE_MODE
}

export function workspaceAutonomyForMode(mode: WorkspaceMode): WorkspaceAutonomy {
  return mode === 'autonomous' ? 'autonomous' : 'supervised'
}

export function workspaceIntentForMode(mode: WorkspaceMode): WorkspaceIntent {
  return mode === 'ask' ? 'question' : 'task'
}
