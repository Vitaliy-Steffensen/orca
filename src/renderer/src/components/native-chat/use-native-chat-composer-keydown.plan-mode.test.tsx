// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useNativeChatComposerKeyDown } from './use-native-chat-composer-keydown'

type Handler = ReturnType<typeof useNativeChatComposerKeyDown>

function setup(args: {
  togglePlanMode?: () => boolean
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
      ...(args.togglePlanMode ? { togglePlanMode: args.togglePlanMode } : {})
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

describe('composer Shift+Tab plan mode chord', () => {
  it('swallows the chord when the chat switched its mode', () => {
    const togglePlanMode = vi.fn(() => true)
    const handler = setup({ togglePlanMode })
    const event = shiftTab()

    press(handler, event)

    expect(togglePlanMode).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
  })

  it('leaves focus traversal alone when the chat has no settable mode', () => {
    const togglePlanMode = vi.fn(() => false)
    const handler = setup({ togglePlanMode })
    const event = shiftTab()

    press(handler, event)

    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('still switches with a mention picker open, which never claims Shift+Tab', () => {
    // The chord sits after the picker block, which deliberately lets a shifted Tab
    // through; a picker on screen must not make the mode unreachable.
    const togglePlanMode = vi.fn(() => true)
    const handler = setup({
      togglePlanMode,
      autocomplete: { mode: 'mention' as const, query: '', triggerKey: '@' }
    })
    const event = shiftTab()

    press(handler, event)

    expect(togglePlanMode).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
  })
})
