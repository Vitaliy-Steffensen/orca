import { afterEach, describe, expect, it } from 'vitest'
import { createEditorStore } from './editor-slice-test-harness'
import { clearChangesFilter, setChangesFilter } from '@/lib/changes-filter'

const START = 's'.repeat(40)
const END = 'e'.repeat(40)

function branchCompare(baseOid: string) {
  return {
    baseRef: 'refs/remotes/origin/main',
    baseOid,
    compareRef: 'feature',
    headOid: 'head-1',
    mergeBase: baseOid,
    changedFiles: 1,
    commitsAhead: 1,
    status: 'ready' as const
  }
}

function turnFilter(latest: boolean) {
  return {
    kind: 'turn' as const,
    compare: { commitOid: END, parentOid: START, compareRef: 'eeeeeee', baseRef: 'sssssss' },
    entries: [{ path: 'src/a.ts', status: 'modified' as const }],
    prompt: 'Do the thing',
    latest
  }
}

function stepOnto(store: ReturnType<typeof createEditorStore>): void {
  store.getState().openDiffAtLocation({
    worktreeId: 'wt-1',
    worktreePath: '/repo',
    relativePath: 'src/a.ts',
    area: 'branch-worktree'
  })
}

afterEach(() => clearChangesFilter('wt-1'))

describe('opening a Changes row under a turn or commit filter', () => {
  it('shows the latest turn live, from just before it to disk, and keeps it there', () => {
    const store = createEditorStore()
    setChangesFilter('wt-1', turnFilter(true))
    stepOnto(store)
    expect(store.getState().openFiles[0]).toMatchObject({
      diffSource: 'branch-worktree',
      branchBasePinned: true,
      branchCompare: { mergeBase: START }
    })

    const next = branchCompare('base-2')
    store.getState().beginGitBranchCompareRequest('wt-1', 'req-2', next.baseRef)
    store.getState().setGitBranchCompareResult('wt-1', 'req-2', { summary: next, entries: [] })
    expect(store.getState().openFiles[0]?.branchCompare?.mergeBase).toBe(START)
  })

  it('lets the same file go back to the branch base when opened without the filter', () => {
    const store = createEditorStore()
    setChangesFilter('wt-1', turnFilter(true))
    stepOnto(store)
    store
      .getState()
      .openBranchWorktreeDiff(
        'wt-1',
        '/repo',
        { path: 'src/a.ts', status: 'modified' },
        branchCompare('base-1'),
        'ts'
      )
    expect(store.getState().openFiles).toHaveLength(1)
    expect(store.getState().openFiles[0]?.branchBasePinned).toBeUndefined()
    expect(store.getState().openFiles[0]?.branchCompare?.mergeBase).toBe('base-1')
  })

  it('shows an older turn as what it changed, frozen', () => {
    const store = createEditorStore()
    setChangesFilter('wt-1', turnFilter(false))
    stepOnto(store)
    expect(store.getState().openFiles[0]).toMatchObject({
      diffSource: 'commit',
      commitCompare: { commitOid: END, parentOid: START }
    })
  })

  it("shows a commit's file as that commit changed it", () => {
    const store = createEditorStore()
    setChangesFilter('wt-1', {
      kind: 'commit',
      compare: { commitOid: END, parentOid: START, compareRef: 'eeeeeee', baseRef: 'sssssss' },
      entries: [{ path: 'src/a.ts', status: 'modified' }],
      subject: 'Fix it'
    })
    stepOnto(store)
    expect(store.getState().openFiles[0]).toMatchObject({
      diffSource: 'commit',
      commitCompare: { commitOid: END, subject: 'Fix it' }
    })
  })
})
