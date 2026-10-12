import { describe, expect, it } from 'vitest'
import { keybindingMatchesAction } from './keybindings'

describe('send queued comments shortcut', () => {
  it('takes Option+Cmd+S on macOS, where Option+S types ß', () => {
    expect(
      keybindingMatchesAction(
        'sourceControl.sendQueuedComments',
        { key: 'ß', code: 'KeyS', control: false, meta: true, alt: true, shift: false },
        'darwin'
      )
    ).toBe(true)
  })
})
