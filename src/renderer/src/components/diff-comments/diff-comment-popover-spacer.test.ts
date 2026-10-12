// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { editor as monacoEditor } from 'monaco-editor'
import { useDiffCommentPopoverSpacer } from './diff-comment-popover-spacer'

function fakeEditor() {
  const zones = new Map<string, monacoEditor.IViewZone>()
  const accessor = {
    addZone: vi.fn((zone: monacoEditor.IViewZone) => {
      const id = `z${zones.size + 1}`
      zones.set(id, zone)
      return id
    }),
    removeZone: vi.fn((id: string) => zones.delete(id)),
    layoutZone: vi.fn()
  }
  const editor = {
    getModel: () => ({}),
    changeViewZones: (run: (a: typeof accessor) => void) => run(accessor)
  } as unknown as monacoEditor.ICodeEditor
  return { editor, zones, accessor }
}

describe('useDiffCommentPopoverSpacer', () => {
  it('opens a gap under the line as tall as the comment box, ahead of saved comments', () => {
    const { editor, zones, accessor } = fakeEditor()
    const { rerender, unmount } = renderHook(
      ({ height }: { height: number }) =>
        useDiffCommentPopoverSpacer({ editor, lineNumber: 117, height }),
      { initialProps: { height: 0 } }
    )
    expect(zones.size).toBe(1)
    const [zone] = zones.values()
    expect(zone.afterLineNumber).toBe(117)
    expect(zone.ordinal).toBe(0)

    rerender({ height: 140 })
    expect(zone.heightInPx).toBeGreaterThanOrEqual(140)
    expect(accessor.layoutZone).toHaveBeenCalledWith('z1')

    unmount()
    expect(zones.size).toBe(0)
  })

  it('reserves nothing without a line', () => {
    const { editor, zones } = fakeEditor()
    renderHook(() => useDiffCommentPopoverSpacer({ editor, lineNumber: null, height: 140 }))
    expect(zones.size).toBe(0)
  })
})
