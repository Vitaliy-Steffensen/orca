// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useNativeChatComposerKeyDown } from './use-native-chat-composer-keydown'

type Handler = ReturnType<typeof useNativeChatComposerKeyDown>

function setup(args: {
  cyclePermissionMode?: () => boolean
  autocomplete?: Parameters<typeof useNativeChatComposerKeyDown>[0]['autocomplete']
}) {
  const hook = renderHook(() =>
    useNativeChatComposerKeyDown({
      autocomplete: args.autocomplete ?? { mode: 'none' as const },
      mentionFiles: { files: [], loading: false, failed: false },
      completeMention: vi.fn(),
      activeSuggestion: 0,
      draft: '',
      isComposing: () => false,
      completePickerItem: vi.fn(),
      dispatchPickerCommand: vi.fn(),
      dismissPicker: vi.fn(),
      interrupt: vi.fn(),
      send: vi.fn(),
      setActiveSuggestion: vi.fn(),
      setDraft: vi.fn(),
      setCaret: vi.fn(),
      ...(args.cyclePermissionMode ? { cyclePermissionMode: args.cyclePermissionMode } : {})
    })
  )
  return hook.result.current
}

function shiftTab() {
  return {
    key: 'Tab',
    shiftKey: true,
    metaKey: false,
    ctrlKey: false,
    keyCode: 0,
    nativeEvent: { isComposing: false },
    preventDefault: vi.fn()
  }
}

function press(handler: Handler, event: ReturnType<typeof shiftTab>): void {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the hook reads only key, modifiers, keyCode, nativeEvent and preventDefault, all present on this stub.
  handler(event as unknown as Parameters<Handler>[0])
}

describe('composer Shift+Tab permission mode chord', () => {
  it('swallows the chord when the chat cycled its mode', () => {
    const cyclePermissionMode = vi.fn(() => true)
    const handler = setup({ cyclePermissionMode })
    const event = shiftTab()

    press(handler, event)

    expect(cyclePermissionMode).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
  })

  it('leaves focus traversal alone when the chat has no settable mode', () => {
    const cyclePermissionMode = vi.fn(() => false)
    const handler = setup({ cyclePermissionMode })
    const event = shiftTab()

    press(handler, event)

    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('still cycles with a mention picker open, which never claims Shift+Tab', () => {
    // The chord sits after the picker block, which deliberately lets a shifted Tab
    // through; a picker on screen must not make the mode unreachable.
    const cyclePermissionMode = vi.fn(() => true)
    const handler = setup({
      cyclePermissionMode,
      autocomplete: { mode: 'mention' as const, query: '', triggerKey: '@' }
    })
    const event = shiftTab()

    press(handler, event)

    expect(cyclePermissionMode).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
  })
})
