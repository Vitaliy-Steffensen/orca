import { describe, expect, it } from 'vitest'
import { keybindingMatchesAction } from './keybindings'

describe('focus review summary shortcut', () => {
  it('takes Shift+Option+Cmd+R on macOS, where Shift+Option+R types ‰', () => {
    expect(
      keybindingMatchesAction(
        'sourceControl.focusReviewSummary',
        { key: '‰', code: 'KeyR', control: false, meta: true, alt: true, shift: true },
        'darwin'
      )
    ).toBe(true)
  })

  it('leaves Option+Cmd+R to renaming the worktree', () => {
    expect(
      keybindingMatchesAction(
        'sourceControl.focusReviewSummary',
        { key: '®', code: 'KeyR', control: false, meta: true, alt: true, shift: false },
        'darwin'
      )
    ).toBe(false)
  })
})
