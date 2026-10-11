import type { GitDiffResult } from '../../../../shared/git-diff-compare-types'

type BranchDiffArgs = {
  compare: { baseRef: string; baseOid: string; headOid: string; mergeBase: string }
  filePath: string
  oldPath?: string
}

export async function loadBranchWorktreeDiff(
  args: BranchDiffArgs,
  read: {
    readBranchDiff: (args: BranchDiffArgs) => Promise<GitDiffResult>
    readWorkingTreeDiff: (args: {
      filePath: string
      staged: false
      compareAgainstHead: true
    }) => Promise<GitDiffResult>
  }
): Promise<GitDiffResult> {
  const [base, workingTree] = await Promise.all([
    read.readBranchDiff(args),
    read.readWorkingTreeDiff({ filePath: args.filePath, staged: false, compareAgainstHead: true })
  ])
  return combineBaseAndWorkingTreeDiff(base, workingTree)
}

/**
 * A branch diff's base side with a working-tree diff's disk side: the file as the branch base had
 * it against the file as it is now, whether the change since is committed or not.
 */
export function combineBaseAndWorkingTreeDiff(
  base: GitDiffResult,
  workingTree: GitDiffResult
): GitDiffResult {
  if (base.kind === 'text' && workingTree.kind === 'text') {
    return { ...workingTree, originalContent: base.originalContent }
  }
  if (!base.originalIsBinary && !workingTree.modifiedIsBinary) {
    return {
      kind: 'text',
      originalContent: base.originalContent,
      modifiedContent: workingTree.modifiedContent,
      originalIsBinary: false,
      modifiedIsBinary: false
    }
  }
  const binary = workingTree.kind === 'binary' ? workingTree : base
  const shared = {
    kind: 'binary' as const,
    originalContent: base.originalContent,
    modifiedContent: workingTree.modifiedContent,
    ...(binary.kind === 'binary' && binary.isImage !== undefined
      ? { isImage: binary.isImage }
      : {}),
    ...(binary.kind === 'binary' && binary.mimeType ? { mimeType: binary.mimeType } : {}),
    ...(workingTree.kind === 'binary' && workingTree.modifiedDeleted
      ? { modifiedDeleted: true }
      : {})
  }
  return base.originalIsBinary
    ? { ...shared, originalIsBinary: true, modifiedIsBinary: workingTree.modifiedIsBinary }
    : { ...shared, originalIsBinary: false, modifiedIsBinary: true }
}
