import { describe, expect, it, vi } from 'vitest'
import type { GitDiffResult } from '../../../../shared/git-diff-compare-types'
import { combineBaseAndWorkingTreeDiff, loadBranchWorktreeDiff } from './branch-worktree-diff'

function text(originalContent: string, modifiedContent: string): GitDiffResult {
  return {
    kind: 'text',
    originalContent,
    modifiedContent,
    originalIsBinary: false,
    modifiedIsBinary: false
  }
}

describe('loadBranchWorktreeDiff', () => {
  it("reads the base side at the fork point, under the file's base path, and the disk side", async () => {
    const readBranchDiff = vi.fn(async () => text('at base', 'at head'))
    const readWorkingTreeDiff = vi.fn(async () => text('at head', 'on disk'))
    await expect(
      loadBranchWorktreeDiff(
        {
          compare: { baseRef: 'main', baseOid: 'b', headOid: 'h', mergeBase: 'm' },
          filePath: 'src/new-name.ts',
          oldPath: 'src/old-name.ts'
        },
        { readBranchDiff, readWorkingTreeDiff }
      )
    ).resolves.toEqual(text('at base', 'on disk'))
    expect(readBranchDiff).toHaveBeenCalledWith({
      compare: { baseRef: 'main', baseOid: 'b', headOid: 'h', mergeBase: 'm' },
      filePath: 'src/new-name.ts',
      oldPath: 'src/old-name.ts'
    })
    expect(readWorkingTreeDiff).toHaveBeenCalledWith({
      filePath: 'src/new-name.ts',
      staged: false,
      compareAgainstHead: true
    })
  })
})

describe('combineBaseAndWorkingTreeDiff', () => {
  it("pairs the base's content with the file on disk", () => {
    expect(
      combineBaseAndWorkingTreeDiff(text('at base', 'at head'), {
        ...text('at head', 'on disk'),
        largeDiffRenderLimit: { limited: false }
      } as GitDiffResult)
    ).toEqual({ ...text('at base', 'on disk'), largeDiffRenderLimit: { limited: false } })
  })

  it('stays a binary diff when either side is binary', () => {
    expect(
      combineBaseAndWorkingTreeDiff(text('', ''), {
        kind: 'binary',
        originalContent: '',
        modifiedContent: 'aGk=',
        originalIsBinary: false,
        modifiedIsBinary: true,
        isImage: true,
        mimeType: 'image/png'
      })
    ).toEqual({
      kind: 'binary',
      originalContent: '',
      modifiedContent: 'aGk=',
      originalIsBinary: false,
      modifiedIsBinary: true,
      isImage: true,
      mimeType: 'image/png'
    })
    expect(
      combineBaseAndWorkingTreeDiff(
        {
          kind: 'binary',
          originalContent: 'b2xk',
          modifiedContent: '',
          originalIsBinary: true,
          modifiedIsBinary: false,
          modifiedDeleted: true
        },
        text('', 'now text')
      )
    ).toEqual({
      kind: 'binary',
      originalContent: 'b2xk',
      modifiedContent: 'now text',
      originalIsBinary: true,
      modifiedIsBinary: false
    })
  })
})
