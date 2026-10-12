import { PRCommentsList } from './comments-list'
import { ResolvedCommentsSection } from './resolved-comments-section'
import type { PrPanelSection } from './pr-panel-sections'
import type { ChecksPanelActiveContentModel } from './active-content-props'

type CommentSectionsModel = Pick<
  ChecksPanelActiveContentModel,
  | 'activeGitLabReview'
  | 'canTargetPRComments'
  | 'comments'
  | 'commentsDisabledReason'
  | 'commentsError'
  | 'commentsLoading'
  | 'commentsSelectionClearRequest'
  | 'handleAddPRComment'
  | 'handleDeleteComment'
  | 'handleEditComment'
  | 'handleReplyToComment'
  | 'handleResolve'
  | 'handleResolveCommentsWithAI'
  | 'handleSetReaction'
  | 'pr'
  | 'resolveCommentsWithAIDisabledReason'
  | 'sourceControlAiActionsVisible'
  | 'stateRequestKey'
>

// Fork: the PR panel's Comments section and, beside it, the Resolved section.
export function buildCommentSections(
  model: CommentSectionsModel,
  reviewKind: 'PR' | 'MR'
): PrPanelSection[] {
  const { pr, comments, canTargetPRComments } = model
  const onReply = pr ? model.handleReplyToComment : undefined
  const onResolve = pr || model.activeGitLabReview ? model.handleResolve : undefined
  const onEditComment = pr ? model.handleEditComment : undefined
  const onDeleteComment = pr ? model.handleDeleteComment : undefined
  const onSetReaction = canTargetPRComments ? model.handleSetReaction : undefined
  return [
    {
      id: 'pr-comments',
      node: (
        <PRCommentsList
          sectionHeader
          comments={comments}
          commentsError={model.commentsError}
          commentsLoading={model.commentsLoading}
          reviewKind={reviewKind}
          commentsDisabled={!canTargetPRComments}
          commentsDisabledReason={model.commentsDisabledReason}
          selectionContextKey={model.stateRequestKey}
          selectionClearRequest={model.commentsSelectionClearRequest}
          resolveCommentsWithAIDisabled={Boolean(model.resolveCommentsWithAIDisabledReason)}
          resolveCommentsWithAIDisabledReason={model.resolveCommentsWithAIDisabledReason}
          onAddComment={pr ? model.handleAddPRComment : undefined}
          onResolveSelectedCommentsWithAI={
            model.sourceControlAiActionsVisible ? model.handleResolveCommentsWithAI : undefined
          }
          onReply={onReply}
          onResolve={onResolve}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
          onSetReaction={onSetReaction}
        />
      )
    },
    {
      id: 'pr-resolved',
      node: (
        <ResolvedCommentsSection
          comments={comments}
          replyDisabled={!canTargetPRComments}
          replyDisabledReason={model.commentsDisabledReason}
          onResolve={onResolve}
          onReply={onReply}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
          onSetReaction={onSetReaction}
        />
      )
    }
  ]
}
