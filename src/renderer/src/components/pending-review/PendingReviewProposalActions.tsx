import React from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'

/**
 * The row an agent's proposal carries and a comment you wrote does not.
 *
 * Why outside `CommentRow` rather than inside it: the row is the shared card every posted
 * comment uses, and accepting is not something a posted comment can do.
 */
export function PendingReviewProposalActions({
  agentName,
  onAccept,
  onReject
}: {
  agentName: string
  onAccept: () => void
  onReject: () => void
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-border/70 px-2 py-1">
      <span className="text-2xs text-muted-foreground">
        {translate(
          'auto.components.pendingReview.proposedBy',
          'Proposed by {{agent}} — not part of your review yet',
          { agent: agentName }
        )}
      </span>
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="xs" variant="secondary" onClick={onAccept}>
              <Check />
              {translate('auto.components.pendingReview.accept', 'Accept')}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4}>
            {translate(
              'auto.components.pendingReview.acceptHint',
              'Add this to your review, to send with your verdict'
            )}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={onReject}
              aria-label={translate('auto.components.pendingReview.reject', 'Reject proposal')}
            >
              <X className="text-destructive" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4}>
            {translate('auto.components.pendingReview.reject', 'Reject proposal')}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
