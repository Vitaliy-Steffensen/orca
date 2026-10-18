export const WORKSPACE_INTENT_VALUES = ['task', 'question'] as const
export type WorkspaceIntent = (typeof WORKSPACE_INTENT_VALUES)[number]
export const DEFAULT_WORKSPACE_INTENT: WorkspaceIntent = 'task'

export function isWorkspaceIntentValue(value: unknown): value is WorkspaceIntent {
  return WORKSPACE_INTENT_VALUES.some((entry) => entry === value)
}

export function resolveWorkspaceIntent(value: unknown): WorkspaceIntent {
  return isWorkspaceIntentValue(value) ? value : DEFAULT_WORKSPACE_INTENT
}

/** One intent when every workspace agrees; empty when the selection is mixed or empty. */
export function uniformWorkspaceIntent(
  worktrees: readonly { workspaceIntent?: unknown }[]
): WorkspaceIntent | '' {
  const [first, ...rest] = worktrees
  if (!first) {
    return ''
  }
  const intent = resolveWorkspaceIntent(first.workspaceIntent)
  return rest.every((item) => resolveWorkspaceIntent(item.workspaceIntent) === intent) ? intent : ''
}
