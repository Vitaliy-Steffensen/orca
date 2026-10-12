import React from 'react'
import { translate } from '@/i18n/i18n'
import type { PendingReviewQueue } from '@/components/pending-review/use-pending-review-queue'
import { PendingReviewCommentCard } from '@/components/pending-review/PendingReviewCommentCard'
import { SectionHeader } from '../listing/section-header'

// Fork: your unsent review comments as a section of their own, beside Review rather than in it.
export function SourceControlPendingCommentsSection({
  queue,
  collapsed,
  onToggle
}: {
  queue: PendingReviewQueue
  collapsed: boolean
  onToggle: () => void
}): React.JSX.Element | null {
  if (queue.comments.length === 0) {
    return null
  }
  return (
    <div>
      <SectionHeader
        label={translate('sourceControlSections.pendingComments', 'Pending review')}
        count={queue.comments.length}
        isCollapsed={collapsed}
        onToggle={onToggle}
      />
      {collapsed ? null : (
        <div className="space-y-2 px-3 pt-1 pb-2">
          {queue.comments.map((comment) => (
            <PendingReviewCommentCard
              key={comment.id}
              comment={comment}
              onChangeBody={(next) => queue.updateBody(comment.id, next)}
              onRemove={() => queue.remove(comment.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
