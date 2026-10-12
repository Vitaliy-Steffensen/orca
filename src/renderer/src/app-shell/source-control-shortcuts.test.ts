import { describe, expect, it, vi } from 'vitest'
import { isUncommittedOnly } from '@/components/right-sidebar/source-control/listing/uncommitted-only-store'
import { takeSourceControlShortcut } from './source-control-shortcuts'

vi.mock('../store', () => ({
  useAppStore: { getState: () => ({ activeWorktreeId: 'wt-shortcut' }) }
}))

const actions = { openDiffNotesSendMenuForActiveWorktree: () => false }

describe('takeSourceControlShortcut', () => {
  it('toggles the uncommitted-only Changes filter for the active workspace', () => {
    const match = (id: string): boolean => id === 'sourceControl.toggleUncommittedOnly'
    expect(takeSourceControlShortcut(match, true, actions)).toBe(
      'sourceControl.toggleUncommittedOnly'
    )
    expect(isUncommittedOnly('wt-shortcut')).toBe(true)
    takeSourceControlShortcut(match, true, actions)
    expect(isUncommittedOnly('wt-shortcut')).toBe(false)
  })
})
