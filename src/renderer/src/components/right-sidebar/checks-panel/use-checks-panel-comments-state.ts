import { useCallback, useState, type SetStateAction } from 'react'
import type { PRComment } from '../../../../../shared/github/comment-types'
import { usePRCommentsState } from '@/components/pr-comments/pr-comments-store'

// Fork: the panel's comment list lives in the shared PR comments store; the read error stays local.
export function useChecksPanelCommentsState(prCommentScopeKey: string) {
  const {
    comments,
    setComments: setCommentsState,
    commentsRef,
    commentsLoading,
    setCommentsLoading
  } = usePRCommentsState(prCommentScopeKey)
  // Why: a failed read keeps its own state so the list says so instead of "No comments".
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const setComments = useCallback(
    (next: SetStateAction<PRComment[]>) => {
      setCommentsError(null)
      setCommentsState(next)
    },
    [setCommentsState]
  )
  return {
    comments,
    setComments,
    commentsRef,
    commentsLoading,
    setCommentsLoading,
    commentsError,
    setCommentsError
  }
}
