import { describe, expect, it } from 'vitest'
import {
  clearUncommittedOnly,
  isUncommittedOnly,
  toggleUncommittedOnly
} from './uncommitted-only-store'

describe('uncommitted-only filter', () => {
  it('toggles per workspace and clears back to every change', () => {
    toggleUncommittedOnly('wt-a')
    expect(isUncommittedOnly('wt-a')).toBe(true)
    expect(isUncommittedOnly('wt-b')).toBe(false)
    toggleUncommittedOnly('wt-a')
    expect(isUncommittedOnly('wt-a')).toBe(false)
    toggleUncommittedOnly('wt-b')
    clearUncommittedOnly('wt-b')
    expect(isUncommittedOnly('wt-b')).toBe(false)
  })
})
