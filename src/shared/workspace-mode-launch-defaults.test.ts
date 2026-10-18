import { describe, expect, it } from 'vitest'
import {
  resolveWorkspaceModeModel,
  resolveWorkspaceModeAgent,
  WORKSPACE_MODE_LAUNCH_DEFAULTS
} from './workspace-mode-launch-defaults'

describe('mode launch defaults', () => {
  it('resolves aliases and discovered prefixes without guessing ids', () => {
    expect(
      resolveWorkspaceModeModel(WORKSPACE_MODE_LAUNCH_DEFAULTS.supervised.model, [{ id: 'opus' }])
    ).toBe('opus')
    expect(
      resolveWorkspaceModeModel(WORKSPACE_MODE_LAUNCH_DEFAULTS.ask.model, [{ id: 'composer-2' }])
    ).toBe('composer-2')
    expect(
      resolveWorkspaceModeModel(WORKSPACE_MODE_LAUNCH_DEFAULTS.ask.model, [{ id: 'auto' }])
    ).toBeUndefined()
    expect(
      resolveWorkspaceModeModel(WORKSPACE_MODE_LAUNCH_DEFAULTS.autonomous.model, [
        { id: 'grok-new' }
      ])
    ).toBeUndefined()
    expect(
      resolveWorkspaceModeModel(WORKSPACE_MODE_LAUNCH_DEFAULTS.supervised.model, [])
    ).toBeUndefined()
  })
  it('uses the discovered CLI default when the host names one', () => {
    expect(
      resolveWorkspaceModeModel(WORKSPACE_MODE_LAUNCH_DEFAULTS.autonomous.model, [
        { id: 'grok-live', isDefault: true }
      ])
    ).toBe('grok-live')
  })
  it('requires the preferred agent to be detected and enabled', () => {
    expect(resolveWorkspaceModeAgent('ask', ['cursor', 'claude'], [], 'claude')).toBe('cursor')
    expect(resolveWorkspaceModeAgent('ask', ['claude'], [], 'claude')).toBe('claude')
    expect(resolveWorkspaceModeAgent('ask', ['cursor'], ['cursor'], 'codex')).toBe('codex')
    expect(resolveWorkspaceModeAgent('autonomous', null, [], null)).toBeNull()
  })
})
