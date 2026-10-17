import { describe, expect, it } from 'vitest'
import { buildChangedPathGroups } from './changed-path-grouping'
import type { GitStatusEntry } from '../../../../../shared/git-status-types'
import type { GitBranchChangeEntry } from '../../../../../shared/git-diff-compare-types'
import { SOURCE_CONTROL_FILE_FILTER_QUERY_MAX_BYTES } from '../source-control/listing/file-filter'

function status(path: string, area: GitStatusEntry['area']): GitStatusEntry {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: grouping reads only path and area.
  return { path, area, status: 'modified' } as GitStatusEntry
}

const branch: GitBranchChangeEntry[] = [
  { path: 'src/app.ts', status: 'modified' },
  { path: 'docs/readme.md', status: 'added' }
]

describe('buildChangedPathGroups', () => {
  it('groups status entries by area', () => {
    const { filteredGrouped } = buildChangedPathGroups(
      [status('a.ts', 'staged'), status('b.ts', 'unstaged'), status('c.ts', 'untracked')],
      [],
      ''
    )
    expect(filteredGrouped.staged.map((e) => e.path)).toEqual(['a.ts'])
    expect(filteredGrouped.unstaged.map((e) => e.path)).toEqual(['b.ts'])
    expect(filteredGrouped.untracked.map((e) => e.path)).toEqual(['c.ts'])
  })

  it('applies the path filter to both status and branch entries', () => {
    const { filteredGrouped, filteredBranchEntries } = buildChangedPathGroups(
      [status('src/a.ts', 'unstaged'), status('docs/b.md', 'unstaged')],
      branch,
      'src'
    )
    expect(filteredGrouped.unstaged.map((e) => e.path)).toEqual(['src/a.ts'])
    expect(filteredBranchEntries.map((e) => e.path)).toEqual(['src/app.ts'])
  })

  it('yields nothing rather than everything for an over-size query', () => {
    const oversized = 'x'.repeat(SOURCE_CONTROL_FILE_FILTER_QUERY_MAX_BYTES + 1)
    const { filter, filteredGrouped, filteredBranchEntries } = buildChangedPathGroups(
      [status('src/a.ts', 'unstaged')],
      branch,
      oversized
    )
    expect(filter.tooLarge).toBe(true)
    expect(filteredGrouped.unstaged).toEqual([])
    expect(filteredBranchEntries).toEqual([])
  })
})
