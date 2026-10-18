import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WORKSPACE_MODE,
  resolveWorkspaceMode,
  isWorkspaceModeValue,
  workspaceAutonomyForMode,
  workspaceIntentForMode
} from './workspace-mode'
import { resolveWorkspaceIntent } from './workspace-intent'

describe('workspace modes', () => {
  it('defaults unknown modes and legacy intent safely', () => {
    expect(DEFAULT_WORKSPACE_MODE).toBe('supervised')
    for (const value of [undefined, null, 'unknown', 4]) {
      expect(resolveWorkspaceMode(value)).toBe('supervised')
      expect(isWorkspaceModeValue(value)).toBe(false)
      expect(resolveWorkspaceIntent(value)).toBe('task')
    }
  })
  it.each([
    ['ask', 'supervised', 'question'],
    ['supervised', 'supervised', 'task'],
    ['autonomous', 'autonomous', 'task']
  ] as const)('%s persists %s clearance and %s intent', (mode, autonomy, intent) => {
    expect(resolveWorkspaceMode(mode)).toBe(mode)
    expect(workspaceAutonomyForMode(mode)).toBe(autonomy)
    expect(workspaceIntentForMode(mode)).toBe(intent)
  })
})
