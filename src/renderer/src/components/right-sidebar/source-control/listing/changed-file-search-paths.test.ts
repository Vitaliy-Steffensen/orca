import { describe, expect, it } from 'vitest'
import type { GitStatusEntry } from '../../../../../../shared/git-status-types'
import type { GitBranchChangeEntry } from '../../../../../../shared/git-diff-compare-types'
import { buildChangedFileSearchPaths } from './changed-file-search-paths'

function status(entry: Partial<GitStatusEntry> & { path: string }): GitStatusEntry {
  return { status: 'modified', area: 'unstaged', ...entry }
}

describe('buildChangedFileSearchPaths', () => {
  it('unions committed, staged, unstaged and untracked paths once each', () => {
    const paths = buildChangedFileSearchPaths(
      [
        status({ path: 'src/a.ts', area: 'staged' }),
        status({ path: 'src/a.ts', area: 'unstaged' }),
        status({ path: 'src/new.ts', area: 'untracked', status: 'untracked' })
      ],
      [
        { path: 'src/a.ts', status: 'modified' },
        { path: 'src/committed.ts', status: 'added' }
      ]
    )
    expect(paths).toEqual(['src/a.ts', 'src/committed.ts', 'src/new.ts'])
  })

  it('drops deleted files, which have nothing on disk to search', () => {
    expect(
      buildChangedFileSearchPaths([status({ path: 'gone.ts', status: 'deleted' })], [])
    ).toEqual([])
  })

  it('uses a rename target, never its vanished pre-image', () => {
    expect(
      buildChangedFileSearchPaths(
        [status({ path: 'new-name.ts', status: 'renamed', oldPath: 'old-name.ts' })],
        []
      )
    ).toEqual(['new-name.ts'])
  })

  it('drops submodule roots so rg never descends into a nested repository', () => {
    expect(
      buildChangedFileSearchPaths(
        [
          status({
            path: 'vendor/lib',
            submodule: { commitChanged: true, trackedChanges: false, untrackedChanges: false }
          }),
          status({ path: 'src/a.ts' })
        ],
        []
      )
    ).toEqual(['src/a.ts'])
  })

  it('honours the uncommitted-only changes filter', () => {
    const entries = [status({ path: 'src/dirty.ts' })]
    const branch: GitBranchChangeEntry[] = [{ path: 'src/committed.ts', status: 'modified' }]
    expect(buildChangedFileSearchPaths(entries, branch, { uncommittedOnly: true })).toEqual([
      'src/dirty.ts'
    ])
  })

  it('uses an explicitly previewed entry list in place of the branch union', () => {
    expect(
      buildChangedFileSearchPaths([status({ path: 'src/dirty.ts' })], [], {
        sourceEntries: [{ path: 'src/turn.ts', status: 'modified' }]
      })
    ).toEqual(['src/turn.ts'])
  })
})
