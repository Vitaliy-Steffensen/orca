import { describe, expect, it } from 'vitest'
import { workspaceRunSplitLayout, workspaceRunSplitRoot } from './workspace-run-split-layout'

describe('workspaceRunSplitRoot', () => {
  it('keeps a lone service as a single pane', () => {
    expect(workspaceRunSplitRoot(['a'])).toEqual({ type: 'leaf', leafId: 'a' })
  })

  it('splits each service off the pane before it', () => {
    expect(workspaceRunSplitRoot(['a', 'b', 'c'])).toEqual({
      type: 'split',
      direction: 'vertical',
      first: { type: 'leaf', leafId: 'a' },
      second: {
        type: 'split',
        direction: 'vertical',
        first: { type: 'leaf', leafId: 'b' },
        second: { type: 'leaf', leafId: 'c' }
      }
    })
  })
})

describe('workspaceRunSplitLayout', () => {
  it('binds every pane to its pty and label in one tab', () => {
    const layout = workspaceRunSplitLayout([
      { leafId: 'a', ptyId: 'pty-a', label: 'Web' },
      { leafId: 'b', ptyId: 'pty-b', label: 'Api' }
    ])
    expect(layout.activeLeafId).toBe('a')
    expect(layout.ptyIdsByLeafId).toEqual({ a: 'pty-a', b: 'pty-b' })
    expect(layout.titlesByLeafId).toEqual({ a: 'Web', b: 'Api' })
  })
})
