import { describe, expect, it } from 'vitest'
import { keybindingMatchesAction } from './keybindings'

describe('uncommitted-only shortcut', () => {
  it('takes Option+Cmd+U on macOS, where Option+U types a dead key', () => {
    expect(
      keybindingMatchesAction(
        'sourceControl.toggleUncommittedOnly',
        { key: 'Dead', code: 'KeyU', control: false, meta: true, alt: true, shift: false },
        'darwin'
      )
    ).toBe(true)
  })
})
