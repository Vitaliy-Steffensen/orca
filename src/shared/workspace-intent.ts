export const WORKSPACE_INTENT_VALUES = ['task', 'question'] as const
export type WorkspaceIntent = (typeof WORKSPACE_INTENT_VALUES)[number]
export const DEFAULT_WORKSPACE_INTENT: WorkspaceIntent = 'task'

export function isWorkspaceIntentValue(value: unknown): value is WorkspaceIntent {
  return WORKSPACE_INTENT_VALUES.some((entry) => entry === value)
}

export function resolveWorkspaceIntent(value: unknown): WorkspaceIntent {
  return isWorkspaceIntentValue(value) ? value : DEFAULT_WORKSPACE_INTENT
}
