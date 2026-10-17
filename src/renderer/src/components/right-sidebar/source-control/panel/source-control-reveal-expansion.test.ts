import { describe, expect, it } from 'vitest'
import { collapsedDirsHidingRow, revealTargetSection } from './source-control-reveal-expansion'

describe('revealTargetSection', () => {
  it('maps each area to the section that holds it', () => {
    expect(revealTargetSection('unstaged::src/a.ts')).toBe('unstaged')
    expect(revealTargetSection('staged::src/a.ts')).toBe('staged')
    expect(revealTargetSection('untracked::src/a.ts')).toBe('untracked')
    expect(revealTargetSection('branch::src/a.ts')).toBe('branch')
    expect(revealTargetSection('branch-worktree::src/a.ts')).toBe('all-changes')
    expect(revealTargetSection('nonsense')).toBeNull()
  })
})

describe('collapsedDirsHidingRow', () => {
  it('names the collapsed ancestors of the row, including a compacted chain', () => {
    const collapsed = new Set([
      'dir::unstaged::src',
      'dir::unstaged::src/deep/nested',
      'dir::unstaged::other'
    ])

    expect(collapsedDirsHidingRow(collapsed, 'unstaged::src/deep/nested/thing.ts')).toEqual([
      'dir::unstaged::src',
      'dir::unstaged::src/deep/nested'
    ])
  })

  it('ignores collapsed dirs in another area', () => {
    const collapsed = new Set(['dir::staged::src'])

    expect(collapsedDirsHidingRow(collapsed, 'unstaged::src/a.ts')).toEqual([])
  })

  it('does not treat a same-prefixed sibling directory as an ancestor', () => {
    const collapsed = new Set(['dir::unstaged::src/deep'])

    expect(collapsedDirsHidingRow(collapsed, 'unstaged::src/deeper/thing.ts')).toEqual([])
  })
})
