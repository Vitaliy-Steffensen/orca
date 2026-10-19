import { describe, expect, it } from 'vitest'
import { keybindingMatchesAction } from './keybindings'

describe('unstaged-only shortcut', () => {
  it('is Cmd+U on macOS and unbound where Ctrl+U belongs to the terminal', () => {
    const mac = { key: 'u', code: 'KeyU', control: false, meta: true, alt: false, shift: false }
    expect(keybindingMatchesAction('sourceControl.toggleUnstagedOnly', mac, 'darwin')).toBe(true)
    const ctrlU = { ...mac, meta: false, control: true }
    expect(keybindingMatchesAction('sourceControl.toggleUnstagedOnly', ctrlU, 'linux')).toBe(false)
    expect(keybindingMatchesAction('sourceControl.toggleUnstagedOnly', ctrlU, 'win32')).toBe(false)
  })
})
