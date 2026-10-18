import { useMemo } from 'react'
import type { GitBranchChangeEntry } from '../../../../../../shared/git-diff-compare-types'
import {
  buildChangedFileIdentity,
  didFileChangeSinceViewed,
  isFileViewed
} from '../../../../../../shared/diff-review-identity'
import type { BranchEntryRowReview } from './branch-entry-row'
import { setFileViewed, useViewedFiles } from './viewed-files-store'

/**
 * Which Changes rows are ticked off. A file stays ticked only while its identity still matches, so
 * a commit unticks the file that moved and leaves the others alone.
 */
export function useChangesReviewProgress(
  activeWorktreeId: string | null,
  allChangeEntries: readonly GitBranchChangeEntry[]
): { reviewByPath: ReadonlyMap<string, BranchEntryRowReview>; viewedCount: number } {
  const viewedFiles = useViewedFiles(activeWorktreeId)
  return useMemo(() => {
    const byPath = new Map<string, BranchEntryRowReview>()
    let viewed = 0
    for (const entry of allChangeEntries) {
      const identity = buildChangedFileIdentity(entry)
      const fileState = viewedFiles.files[entry.path]
      const isViewed = isFileViewed(fileState, identity)
      if (isViewed) {
        viewed += 1
      }
      byPath.set(entry.path, {
        isViewed,
        changedSinceViewed: didFileChangeSinceViewed(fileState, identity),
        onToggleViewed: () => {
          if (activeWorktreeId) {
            setFileViewed(activeWorktreeId, entry.path, identity, !isViewed)
          }
        }
      })
    }
    return { reviewByPath: byPath, viewedCount: viewed }
  }, [activeWorktreeId, allChangeEntries, viewedFiles])
}
