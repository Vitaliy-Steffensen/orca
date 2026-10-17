import { describe, expect, it } from 'vitest'
import {
  buildCombinedDiffBranchTreeRoots,
  buildCombinedDiffUncommittedTreeGroups
} from './combined-diff-file-tree-model'
import { findCombinedDiffTreeRevealTarget } from './combined-diff-tree-reveal-target'
import type { GitBranchChangeEntry } from '../../../../../../shared/git-diff-compare-types'
import type { GitStatusEntry } from '../../../../../../shared/git-status-types'

const branchEntries: GitBranchChangeEntry[] = [
  { path: 'src/deep/nested/thing.ts', status: 'modified' },
  { path: 'src/other.ts', status: 'modified' }
]

describe('findCombinedDiffTreeRevealTarget', () => {
  it('returns the row key and every collapsed ancestor between the root and the file', () => {
    const roots = buildCombinedDiffBranchTreeRoots('branch', branchEntries)

    const target = findCombinedDiffTreeRevealTarget({
      mode: 'branch',
      roots,
      sectionKey: 'combined-branch:src/deep/nested/thing.ts'
    })

    expect(target?.rowKey).toBe('combined-branch::src/deep/nested/thing.ts')
    // 'deep' holds a single child, so the tree compacts it into its descendant's row.
    expect(target?.ancestorKeys).toEqual([
      'dir::combined-branch::src',
      'dir::combined-branch::src/deep/nested'
    ])
  })

  it('keeps same-path entries in different staging areas apart', () => {
    const entries: GitStatusEntry[] = [
      { path: 'src/App.tsx', status: 'modified', area: 'unstaged' },
      { path: 'src/App.tsx', status: 'modified', area: 'staged' }
    ]
    const roots = buildCombinedDiffUncommittedTreeGroups(entries).flatMap((group) => group.roots)

    expect(
      findCombinedDiffTreeRevealTarget({
        mode: 'uncommitted',
        roots,
        sectionKey: 'staged:src/App.tsx'
      })?.rowKey
    ).toBe('staged::src/App.tsx')
  })

  it('finds nothing when the section is filtered out of the tree', () => {
    const roots = buildCombinedDiffBranchTreeRoots('branch', [branchEntries[1]])

    expect(
      findCombinedDiffTreeRevealTarget({
        mode: 'branch',
        roots,
        sectionKey: 'combined-branch:src/deep/nested/thing.ts'
      })
    ).toBeNull()
  })
})
