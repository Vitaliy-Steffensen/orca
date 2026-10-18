import React from 'react'
import { FileCommentBadges } from '@/components/diff-comments/FileCommentBadges'
import { useWorkspaceFileCommentCounts } from '@/components/diff-comments/file-comment-counts'

/** What a diff tab says about its comments, in the same vocabulary every file row uses. */
export function DiffFileCommentBadges({
  worktreeId,
  path
}: {
  worktreeId: string | null
  path: string | undefined
}): React.JSX.Element | null {
  const countsByPath = useWorkspaceFileCommentCounts(worktreeId)
  return <FileCommentBadges counts={path ? countsByPath.get(path) : undefined} />
}
