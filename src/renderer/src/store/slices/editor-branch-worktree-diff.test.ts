import { describe, expect, it } from 'vitest'
import { createEditorStore } from './editor-slice-test-harness'
import { parseChangedFileRowKey } from './editor/actions/changed-file-order'

function compare(baseOid: string, headOid = 'head-1') {
  return {
    baseRef: 'refs/remotes/origin/main',
    baseOid,
    compareRef: 'feature',
    headOid,
    mergeBase: baseOid,
    changedFiles: 1,
    commitsAhead: 1,
    status: 'ready' as const
  }
}

describe('branch base → disk diff tabs', () => {
  it('opens one live tab per file and moves it to a newer compare on reopen', () => {
    const store = createEditorStore()
    const entry = { path: 'src/new.ts', status: 'renamed' as const, oldPath: 'src/old.ts' }
    store.getState().openBranchWorktreeDiff('wt-1', '/repo', entry, compare('base-1'), 'ts')
    const [opened] = store.getState().openFiles
    expect(opened).toMatchObject({
      filePath: '/repo/src/new.ts',
      relativePath: 'src/new.ts',
      mode: 'diff',
      diffSource: 'branch-worktree',
      branchOldPath: 'src/old.ts',
      branchCompare: { baseOid: 'base-1', mergeBase: 'base-1' }
    })

    store
      .getState()
      .openBranchWorktreeDiff('wt-1', '/repo', entry, compare('base-1', 'head-2'), 'ts')
    expect(store.getState().openFiles).toHaveLength(1)
    expect(store.getState().openFiles[0]).toMatchObject({
      id: opened?.id,
      branchCompare: { headOid: 'head-2' }
    })
  })

  it('steps onto an all-changes row by opening its branch base → disk diff', () => {
    const store = createEditorStore()
    const summary = compare('base-1')
    store.getState().beginGitBranchCompareRequest('wt-1', 'req-1', summary.baseRef)
    store.getState().setGitBranchCompareResult('wt-1', 'req-1', {
      summary,
      entries: [{ path: 'src/a.ts', status: 'modified' }]
    })
    expect(parseChangedFileRowKey('branch-worktree::src/a.ts')).toEqual({
      area: 'branch-worktree',
      relativePath: 'src/a.ts'
    })

    store.getState().openDiffAtLocation({
      worktreeId: 'wt-1',
      worktreePath: '/repo',
      relativePath: 'src/a.ts',
      area: 'branch-worktree'
    })

    expect(store.getState().openFiles[0]).toMatchObject({
      diffSource: 'branch-worktree',
      branchCompare: { mergeBase: 'base-1' }
    })
  })

  it('follows a new compare even when the file has no committed change', () => {
    const store = createEditorStore()
    const entry = { path: 'src/local-only.ts', status: 'modified' as const }
    store.getState().openBranchWorktreeDiff('wt-1', '/repo', entry, compare('base-1'), 'ts')
    const [opened] = store.getState().openFiles

    const next = compare('base-2')
    store.getState().beginGitBranchCompareRequest('wt-1', 'req-2', next.baseRef)
    store.getState().setGitBranchCompareResult('wt-1', 'req-2', { summary: next, entries: [] })

    expect(store.getState().openFiles[0]?.branchCompare?.mergeBase).toBe('base-2')
    expect(store.getState().openFiles[0]?.diffContentReloadNonce).toBe(
      (opened?.diffContentReloadNonce ?? 0) + 1
    )
  })
})
