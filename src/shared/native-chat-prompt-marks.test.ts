import { describe, expect, it } from 'vitest'
import {
  SIMPLIFY_PROMPT_MARK_ID,
  SIMPLIFY_PROMPT_MARK_PROMPT,
  defaultNativeChatPromptMarks,
  messageWithNativeChatPromptMark,
  normalizeNativeChatPromptMarks
} from './native-chat-prompt-marks'

const simplify = defaultNativeChatPromptMarks()[0]!

describe('native chat prompt marks', () => {
  it('seeds Simplify when nothing is saved', () => {
    expect(normalizeNativeChatPromptMarks(undefined)).toEqual([
      {
        id: SIMPLIFY_PROMPT_MARK_ID,
        name: 'Simplify',
        prompt: SIMPLIFY_PROMPT_MARK_PROMPT,
        placement: 'prefix'
      }
    ])
  })

  it('keeps an explicit empty list', () => {
    expect(normalizeNativeChatPromptMarks([])).toEqual([])
  })

  it('drops blank rows and keeps a saved placement', () => {
    expect(
      normalizeNativeChatPromptMarks([
        { id: 'a', name: '  Short  ', prompt: '  Be brief.  ', placement: 'suffix' },
        { id: 'a', name: 'Duplicate', prompt: 'nope' },
        { id: '', name: 'Missing id', prompt: 'nope' },
        { id: 'blank', name: '   ', prompt: '   ' }
      ])
    ).toEqual([{ id: 'a', name: 'Short', prompt: 'Be brief.', placement: 'suffix' }])
  })

  it('puts the instruction before or after the message', () => {
    expect(messageWithNativeChatPromptMark('How does auth work?', simplify)).toBe(
      `${SIMPLIFY_PROMPT_MARK_PROMPT}\n\nHow does auth work?`
    )
    expect(
      messageWithNativeChatPromptMark('How does auth work?', { ...simplify, placement: 'suffix' })
    ).toBe(`How does auth work?\n\n${SIMPLIFY_PROMPT_MARK_PROMPT}`)
  })

  it('leaves slash commands untouched and still marks an image-only send', () => {
    expect(messageWithNativeChatPromptMark('/compact', simplify)).toBe('/compact')
    expect(messageWithNativeChatPromptMark('   ', simplify)).toBe(SIMPLIFY_PROMPT_MARK_PROMPT)
    expect(messageWithNativeChatPromptMark('Hello', null)).toBe('Hello')
  })
})
