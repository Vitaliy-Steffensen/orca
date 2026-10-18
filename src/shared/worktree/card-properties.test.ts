import { describe, expect, it } from 'vitest'
import {
  isRetiredCompactWorktreeCardProperties,
  normalizeWorktreeCardProperties
} from './card-properties'

describe('worktree card properties', () => {
  it('normalizes fixed and legacy properties while preserving selected properties', () => {
    expect(normalizeWorktreeCardProperties(['ci', 'branch', 'pr', 'automation', 'unread'])).toEqual(
      ['status', 'unread', 'ci', 'branch', 'pr', 'automation']
    )
  })

  it('recognizes only exact retired Compact presets', () => {
    expect(isRetiredCompactWorktreeCardProperties(['status'])).toBe(true)
    expect(isRetiredCompactWorktreeCardProperties(['status', 'unread'])).toBe(true)
    expect(isRetiredCompactWorktreeCardProperties(['status', 'automation'])).toBe(true)
    expect(isRetiredCompactWorktreeCardProperties(['status', 'unread', 'automation'])).toBe(true)
    expect(isRetiredCompactWorktreeCardProperties(['automation', 'status'])).toBe(false)
    expect(isRetiredCompactWorktreeCardProperties(['status', 'automation', 'pr'])).toBe(false)
  })

  it('leaves an explicitly chosen property set alone', () => {
    expect(isRetiredCompactWorktreeCardProperties(['status', 'unread', 'pr'])).toBe(false)
  })
})
