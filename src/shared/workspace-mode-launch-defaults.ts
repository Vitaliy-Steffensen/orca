import type { TuiAgent } from './tui-agent'
import { isTuiAgentEnabled } from './tui-agent-selection'
import type { WorkspaceMode } from './workspace-mode'

export type WorkspaceModeModelPreference =
  | { kind: 'alias' | 'prefix'; id: string }
  | { kind: 'cli-default' }

export const WORKSPACE_MODE_LAUNCH_DEFAULTS: Record<
  WorkspaceMode,
  {
    agent: TuiAgent
    model: WorkspaceModeModelPreference
  }
> = {
  ask: { agent: 'cursor', model: { kind: 'prefix', id: 'composer' } },
  supervised: { agent: 'claude', model: { kind: 'alias', id: 'opus' } },
  autonomous: { agent: 'grok', model: { kind: 'cli-default' } }
}

export function resolveWorkspaceModeModel(
  preference: WorkspaceModeModelPreference,
  models: readonly { id: string; isDefault?: boolean }[]
): string | undefined {
  if (preference.kind === 'cli-default') {
    return models.find((model) => model.isDefault)?.id
  }
  return models.find((model) =>
    preference.kind === 'alias' ? model.id === preference.id : model.id.startsWith(preference.id)
  )?.id
}

export function resolveWorkspaceModeAgent(
  mode: WorkspaceMode,
  detected: Iterable<TuiAgent> | null,
  disabled: Iterable<unknown> | null | undefined,
  fallback: TuiAgent | null
): TuiAgent | null {
  const preferred = WORKSPACE_MODE_LAUNCH_DEFAULTS[mode].agent
  return detected && new Set(detected).has(preferred) && isTuiAgentEnabled(preferred, disabled)
    ? preferred
    : fallback
}
