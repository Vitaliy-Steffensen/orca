// @vitest-environment happy-dom

// The reported bug: Shift+Tab did nothing and the browser moved focus to the toolbar.
// A structured session rebuilds each model's options from the host's own report, which
// describes efforts, tiers and Fast and nothing else — so the permission mode never
// reached the snapshot the chord reads, on any chat whose model list had landed.

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  createStructuredAgentSessionOptionState,
  applyStructuredAgentSessionModelCatalog,
  structuredAgentSessionOptionSnapshot
} from '../../../../shared/structured-agent-session-options'
import { structuredAgentSessionSeedCatalog } from '../../../../shared/structured-agent-session-seed-catalog'
import type {
  SessionOptionDescriptor,
  SessionOptionsSurface
} from '../../../../shared/native-chat-session-options'
import { useNativeChatPlanModeToggle } from './native-chat-plan-mode-toggle'
import { useNativeChatComposerKeyDown } from './use-native-chat-composer-keydown'

type Handler = ReturnType<typeof useNativeChatComposerKeyDown>

/** The snapshot a never-launched structured Claude chat renders, built the way the
 *  options hook builds it: the host's model list, then the pick-acceptance rule. */
function preLaunchSnapshot(): SessionOptionDescriptor[] {
  const seed = structuredAgentSessionSeedCatalog('claude')
  const state = applyStructuredAgentSessionModelCatalog(
    createStructuredAgentSessionOptionState('claude', seed),
    seed,
    {
      origin: 'probe',
      models: [
        {
          id: 'sonnet',
          label: 'Sonnet',
          isDefault: true,
          efforts: [
            { value: 'low', label: 'Low' },
            { value: 'high', label: 'High' }
          ]
        }
      ],
      listingNamesConfiguredModel: true,
      fetchedAt: 0
    },
    { newLaunch: true }
  )
  return structuredAgentSessionOptionSnapshot(state)
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

describe('Shift+Tab against a host-listed model', () => {
  it('offers a settable permission mode', () => {
    const permissionMode = preLaunchSnapshot().find((row) => row.id === 'permissionMode')
    expect(permissionMode).toMatchObject({ settable: true })
  })

  it('switches to Plan and swallows the chord instead of moving focus', () => {
    const optionsSurface = surface()
    const snapshot = preLaunchSnapshot()
    const toggle = renderHook(() => useNativeChatPlanModeToggle(optionsSurface, snapshot)).result
      .current
    const handler = renderHook(() =>
      useNativeChatComposerKeyDown({
        autocomplete: { mode: 'none' as const },
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
        togglePlanMode: toggle,
        setActiveSuggestion: vi.fn(),
        setDraft: vi.fn(),
        setCaret: vi.fn()
      })
    ).result.current
    const event = shiftTab()

    press(handler, event)

    expect(optionsSurface.setOption).toHaveBeenCalledWith('permissionMode', 'plan')
    expect(event.preventDefault).toHaveBeenCalledOnce()
  })
})
