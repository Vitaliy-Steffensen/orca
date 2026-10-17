// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  nextPermissionMode,
  useNativeChatPermissionModeCycle
} from './native-chat-permission-mode-cycle'
import type {
  SessionOptionDescriptor,
  SessionOptionsSurface
} from '../../../../shared/native-chat-session-options'

function descriptor(currentValue: string | undefined, settable = true): SessionOptionDescriptor {
  return {
    id: 'permissionMode',
    label: 'Permission mode',
    category: 'mode',
    valueSource: 'dispatched',
    transport: 'agent-session',
    settable,
    kind: {
      type: 'select',
      ...(currentValue ? { currentValue } : {}),
      choices: [
        { value: 'default', label: 'Normal' },
        { value: 'acceptEdits', label: 'Accept edits' },
        { value: 'plan', label: 'Plan' }
      ]
    }
  }
}

function surface(): SessionOptionsSurface & { setOption: ReturnType<typeof vi.fn> } {
  const setOption = vi.fn(async () => ({ snapshot: [] }))
  return {
    getSnapshot: () => [],
    setOption,
    invokeAction: async () => ({ snapshot: [] }),
    subscribe: () => () => {}
  }
}

describe('nextPermissionMode', () => {
  it('wraps through Claude Code’s own order', () => {
    expect(nextPermissionMode('default')).toBe('acceptEdits')
    expect(nextPermissionMode('acceptEdits')).toBe('plan')
    expect(nextPermissionMode('plan')).toBe('default')
  })

  it('advances from the catalog default when nothing has reported a mode', () => {
    // Otherwise the first Shift+Tab of a fresh chat re-sends `default` and the user
    // presses three times to reach Plan.
    expect(nextPermissionMode(undefined)).toBe('acceptEdits')
  })

  it('resets a named mode that is off the cycle', () => {
    expect(nextPermissionMode('bypassPermissions')).toBe('default')
    expect(nextPermissionMode('dontAsk')).toBe('default')
  })
})

describe('useNativeChatPermissionModeCycle', () => {
  it('advances the live mode and claims the chord', () => {
    const optionsSurface = surface()
    const { result } = renderHook(() =>
      useNativeChatPermissionModeCycle(optionsSurface, [descriptor('acceptEdits')])
    )
    expect(result.current()).toBe(true)
    expect(optionsSurface.setOption).toHaveBeenCalledWith('permissionMode', 'plan')
  })

  it('reaches Plan in two presses from a chat that has reported no mode', () => {
    const optionsSurface = surface()
    const fresh = renderHook(() =>
      useNativeChatPermissionModeCycle(optionsSurface, [descriptor(undefined)])
    )
    expect(fresh.result.current()).toBe(true)
    expect(optionsSurface.setOption).toHaveBeenLastCalledWith('permissionMode', 'acceptEdits')
    const stepped = renderHook(() =>
      useNativeChatPermissionModeCycle(optionsSurface, [descriptor('acceptEdits')])
    )
    expect(stepped.result.current()).toBe(true)
    expect(optionsSurface.setOption).toHaveBeenLastCalledWith('permissionMode', 'plan')
  })

  it('leaves Shift+Tab alone where the mode is not settable or absent', () => {
    const optionsSurface = surface()
    const locked = renderHook(() =>
      useNativeChatPermissionModeCycle(optionsSurface, [descriptor('plan', false)])
    )
    expect(locked.result.current()).toBe(false)
    const absent = renderHook(() => useNativeChatPermissionModeCycle(optionsSurface, []))
    expect(absent.result.current()).toBe(false)
    expect(optionsSurface.setOption).not.toHaveBeenCalled()
  })
})
