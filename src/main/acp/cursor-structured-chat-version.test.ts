import { describe, expect, it } from 'vitest'
import { cursorStructuredChatVersion } from './cursor-structured-chat-version'

describe('cursorStructuredChatVersion', () => {
  it('accepts ACP builds and treats the hex token as a build id', () => {
    expect(cursorStructuredChatVersion('2026.09.15-a3815c0')).toBe(true)
    expect(cursorStructuredChatVersion('2026.10.16-e3cb207')).toBe(true)
    expect(cursorStructuredChatVersion('2026.10.01')).toBe(true)
  })

  it('keeps older and unreadable builds on the terminal', () => {
    expect(cursorStructuredChatVersion('2026.09.14-aaaaaaa')).toBe(false)
    expect(cursorStructuredChatVersion('2026.08.01')).toBe(false)
    expect(cursorStructuredChatVersion('1.0.0')).toBe(false)
    expect(cursorStructuredChatVersion('')).toBe(false)
  })
})
