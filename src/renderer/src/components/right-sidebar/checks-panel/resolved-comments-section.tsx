import React, { useMemo, useState } from 'react'
import { translate } from '@/i18n/i18n'
import { useNow } from '@/hooks/use-now'
import { usePRBotAuthorOverrides } from '@/lib/pr-bot-author-overrides'
import {
  partitionPRCommentGroupsForTriage,
  sortPRCommentGroupsByRecency
} from '@/lib/pr-comment-action-state'
import type { GitHubReactionContent, PRComment } from '../../../../../shared/github/comment-types'
import { getPRCommentGroupId, groupPRComments } from '../../../../../shared/pr-comment-groups'
import type { RightPanelCommentSubmitResult } from '../right-panel-comment-composer'
import { getPRCommentPresentationClasses } from '../pr-comment-presentation'
import { SectionHeader } from '../source-control/listing/section-header'
import { PRCommentGroupView } from './comment-group'

// Fork: resolved threads as a PR panel section of their own, closed until opened like the
// accordion they replace inside Comments.
export function ResolvedCommentsSection({
  comments,
  replyDisabled,
  replyDisabledReason,
  onResolve,
  onReply,
  onEditComment,
  onDeleteComment,
  onSetReaction
}: {
  comments: readonly PRComment[]
  replyDisabled?: boolean
  replyDisabledReason?: string
  onResolve?: (threadId: string, resolve: boolean) => boolean | Promise<boolean>
  onReply?: (comment: PRComment, body: string) => Promise<RightPanelCommentSubmitResult>
  onEditComment?: (comment: PRComment, body: string) => Promise<boolean>
  onDeleteComment?: (comment: PRComment) => void | Promise<void>
  onSetReaction?: (
    comment: PRComment,
    content: GitHubReactionContent,
    reacted: boolean
  ) => Promise<boolean>
}): React.JSX.Element | null {
  const [collapsed, setCollapsed] = useState(true)
  const [replyingCommentId, setReplyingCommentId] = useState<number | null>(null)
  const presentation = useMemo(() => getPRCommentPresentationClasses(), [])
  const botAuthorOverrides = usePRBotAuthorOverrides()
  const resolved = useMemo(
    () =>
      partitionPRCommentGroupsForTriage(
        sortPRCommentGroupsByRecency(groupPRComments([...comments]), 'newest-first')
      ).resolved,
    [comments]
  )
  const now = useNow(60_000, resolved.length > 0 && !collapsed)
  if (resolved.length === 0) {
    return null
  }
  return (
    <div>
      <SectionHeader
        label={translate('prPanelSections.resolved', 'Resolved')}
        count={resolved.length}
        isCollapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />
      {!collapsed && (
        <div className={presentation.list}>
          {resolved.map((group) => (
            <PRCommentGroupView
              key={getPRCommentGroupId(group)}
              group={group}
              botAuthorOverrides={botAuthorOverrides}
              replyingCommentId={replyingCommentId}
              now={now}
              actionState="resolved"
              isQueued={false}
              replyDisabled={replyDisabled}
              replyDisabledReason={replyDisabledReason}
              presentation={presentation}
              onResolve={onResolve}
              onStartReply={setReplyingCommentId}
              onCancelReply={(commentId) =>
                setReplyingCommentId((current) => (current === commentId ? null : current))
              }
              onReply={onReply}
              onEditComment={onEditComment}
              onDeleteComment={onDeleteComment}
              onSetReaction={onSetReaction}
            />
          ))}
        </div>
      )}
    </div>
  )
}
