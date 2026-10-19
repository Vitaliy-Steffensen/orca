import { describe, expect, it } from 'vitest'
import {
  buildUnifiedChatModelChoices,
  chooseUnifiedChatAgent,
  decodeUnifiedChatModelValue,
  encodeUnifiedChatModelValue,
  unifiedChatCanSwitchProvider
} from './unified-claude-cursor-chat'

describe('chooseUnifiedChatAgent', () => {
  it('starts on the provider the last chat used', () => {
    expect(
      chooseUnifiedChatAgent({
        available: ['claude', 'cursor'],
        defaultAgent: 'claude',
        lastAgent: 'cursor'
      })
    ).toBe('cursor')
  })

  it('uses the default when it is one of the two', () => {
    expect(
      chooseUnifiedChatAgent({
        available: ['claude', 'cursor'],
        defaultAgent: 'cursor',
        lastAgent: null
      })
    ).toBe('cursor')
  })

  it('falls through to Claude when the default is another agent', () => {
    expect(
      chooseUnifiedChatAgent({
        available: ['cursor', 'claude'],
        defaultAgent: 'codex',
        lastAgent: null
      })
    ).toBe('claude')
  })

  it('returns null when neither is available', () => {
    expect(
      chooseUnifiedChatAgent({
        available: ['codex'],
        defaultAgent: 'codex',
        lastAgent: 'claude'
      })
    ).toBeNull()
  })
})

describe('buildUnifiedChatModelChoices', () => {
  it('lists the current provider first and keeps the other provider selectable', () => {
    const built = buildUnifiedChatModelChoices({
      currentAgent: 'claude',
      currentModels: [{ id: 'opus', label: 'Opus' }],
      currentModelId: 'opus',
      otherAgent: 'cursor',
      otherModels: [{ id: 'gpt-5.3-codex', label: 'GPT-5.3 Codex' }],
      groupLabel: (agent) => (agent === 'claude' ? 'Claude' : 'Cursor')
    })
    expect(built?.choices.map((choice) => choice.group)).toEqual(['Claude', 'Cursor'])
    expect(built?.currentValue).toBe(encodeUnifiedChatModelValue('claude', 'opus'))
    expect(decodeUnifiedChatModelValue(built?.choices[1]?.value ?? '')).toEqual({
      agent: 'cursor',
      modelId: 'gpt-5.3-codex'
    })
  })

  it('leaves a one-provider menu alone', () => {
    expect(
      buildUnifiedChatModelChoices({
        currentAgent: 'claude',
        currentModels: [{ id: 'opus', label: 'Opus' }],
        currentModelId: 'opus',
        otherAgent: null,
        otherModels: [],
        groupLabel: () => 'Claude'
      })
    ).toBeNull()
  })
})

describe('unifiedChatCanSwitchProvider', () => {
  it('stays open until a person has sent', () => {
    expect(unifiedChatCanSwitchProvider({ journalItems: [], submissionCount: 0 })).toBe(true)
    expect(
      unifiedChatCanSwitchProvider({
        journalItems: [{ body: { kind: 'message', role: 'user' } }],
        submissionCount: 0
      })
    ).toBe(false)
    expect(unifiedChatCanSwitchProvider({ journalItems: [], submissionCount: 1 })).toBe(false)
  })
})
