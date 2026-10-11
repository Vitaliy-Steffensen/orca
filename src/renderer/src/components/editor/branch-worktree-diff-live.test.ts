import { describe, expect, it } from 'vitest'
import type { OpenFile } from '@/store/slices/editor'
import { canAutoSaveOpenFile, isExternalReloadableEditorTab } from './editor-autosave'
import { shouldReloadDiffOnGitStatusChange } from './editor-panel-diff-reload'

const tab: OpenFile = {
  id: 'wt::branch-worktree::src/a.ts',
  filePath: '/repo/src/a.ts',
  relativePath: 'src/a.ts',
  worktreeId: 'wt',
  language: 'typescript',
  isDirty: false,
  mode: 'diff',
  diffSource: 'branch-worktree'
}

describe('a branch base → disk diff tab', () => {
  it('follows the file on disk and saves edits back to it, like an unstaged diff', () => {
    expect(isExternalReloadableEditorTab(tab)).toBe(true)
    expect(canAutoSaveOpenFile(tab)).toBe(true)
  })

  it('reloads on a status change even when the file has nothing uncommitted', () => {
    expect(shouldReloadDiffOnGitStatusChange(tab, [])).toBe(true)
  })
})
