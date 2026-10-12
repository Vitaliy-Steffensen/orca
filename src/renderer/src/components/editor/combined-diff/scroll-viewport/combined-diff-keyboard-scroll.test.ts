// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import {
  ARROW_SCROLL_STEP_PX,
  adjacentSectionIndex,
  resolveCombinedDiffKey
} from './combined-diff-keyboard-scroll'

const key = (
  k: string,
  mods: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>> = {}
) => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods
})

function monacoTextarea(readOnly: boolean): HTMLTextAreaElement {
  const editor = document.createElement('div')
  editor.className = 'monaco-editor'
  const textarea = document.createElement('textarea')
  textarea.setAttribute('aria-autocomplete', readOnly ? 'none' : 'both')
  editor.appendChild(textarea)
  document.body.appendChild(editor)
  return textarea
}

describe('resolveCombinedDiffKey', () => {
  it('scrolls the view with the arrow keys outside anything you can type in', () => {
    expect(resolveCombinedDiffKey(key('ArrowDown'), document.body)).toEqual({
      kind: 'scroll',
      delta: ARROW_SCROLL_STEP_PX
    })
    expect(resolveCombinedDiffKey(key('ArrowUp'), monacoTextarea(true))).toEqual({
      kind: 'scroll',
      delta: -ARROW_SCROLL_STEP_PX
    })
  })

  it('leaves the arrows to an editable diff or a text field', () => {
    expect(resolveCombinedDiffKey(key('ArrowDown'), monacoTextarea(false))).toBeNull()
    expect(resolveCombinedDiffKey(key('ArrowDown'), document.createElement('input'))).toBeNull()
  })

  it('leaves modified arrows to the keybindings, like the next-file step', () => {
    expect(resolveCombinedDiffKey(key('ArrowDown', { metaKey: true }), document.body)).toBeNull()
    expect(resolveCombinedDiffKey(key('ArrowDown', { shiftKey: true }), document.body)).toBeNull()
    expect(resolveCombinedDiffKey(key('ArrowLeft'), document.body)).toBeNull()
  })
})

describe('adjacentSectionIndex', () => {
  const starts = [0, 400, 900, 1500]

  it('puts the next file at the top', () => {
    expect(adjacentSectionIndex(starts, 0, 1)).toBe(1)
    expect(adjacentSectionIndex(starts, 450, 1)).toBe(2)
    expect(adjacentSectionIndex(starts, 1500, 1)).toBeNull()
  })

  it('goes back to the top of the file you are in, then to the one before', () => {
    expect(adjacentSectionIndex(starts, 450, -1)).toBe(1)
    expect(adjacentSectionIndex(starts, 400, -1)).toBe(0)
    expect(adjacentSectionIndex(starts, 0, -1)).toBeNull()
  })
})
