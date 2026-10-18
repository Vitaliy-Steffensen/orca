// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { planModeToggleTarget, useNativeChatPlanModeToggle } from './native-chat-plan-mode-toggle'
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

describe('planModeToggleTarget', () => {
  it('turns Plan on from any other mode', () => {
    expect(planModeToggleTarget('default', 'default')).toBe('plan')
    expect(planModeToggleTarget('acceptEdits', 'acceptEdits')).toBe('plan')
    expect(planModeToggleTarget(undefined, 'default')).toBe('plan')
  })

  it('turns Plan off back to the mode it was left from', () => {
    expect(planModeToggleTarget('plan', 'default')).toBe('default')
    expect(planModeToggleTarget('plan', 'acceptEdits')).toBe('acceptEdits')
  })
})

describe('useNativeChatPlanModeToggle', () => {
  it('reaches Plan in one press and never stops at Accept edits', () => {
    const optionsSurface = surface()
    const { result } = renderHook(() =>
      useNativeChatPlanModeToggle(optionsSurface, [descriptor('default')])
    )

    expect(result.current()).toBe(true)
    expect(optionsSurface.setOption).toHaveBeenCalledWith('permissionMode', 'plan')
  })

  it('returns to Accept edits when that is what Plan was turned on from', () => {
    const optionsSurface = surface()
    const snapshot = { current: [descriptor('acceptEdits')] }
    const { result, rerender } = renderHook(() =>
      useNativeChatPlanModeToggle(optionsSurface, snapshot.current)
    )

    act(() => void result.current())
    expect(optionsSurface.setOption).toHaveBeenLastCalledWith('permissionMode', 'plan')

    snapshot.current = [descriptor('plan')]
    rerender()
    act(() => void result.current())

    expect(optionsSurface.setOption).toHaveBeenLastCalledWith('permissionMode', 'acceptEdits')
  })

  it('leaves Plan to Normal when nothing named the mode it came from', () => {
    // A chat the launch already seeded into Plan: no press put it there.
    const optionsSurface = surface()
    const { result } = renderHook(() =>
      useNativeChatPlanModeToggle(optionsSurface, [descriptor('plan')])
    )

    expect(result.current()).toBe(true)
    expect(optionsSurface.setOption).toHaveBeenCalledWith('permissionMode', 'default')
  })

  it('leaves Shift+Tab alone where the mode is not settable or absent', () => {
    const optionsSurface = surface()
    const locked = renderHook(() =>
      useNativeChatPlanModeToggle(optionsSurface, [descriptor('plan', false)])
    )
    expect(locked.result.current()).toBe(false)
    const absent = renderHook(() => useNativeChatPlanModeToggle(optionsSurface, []))
    expect(absent.result.current()).toBe(false)
    expect(optionsSurface.setOption).not.toHaveBeenCalled()
  })
})
