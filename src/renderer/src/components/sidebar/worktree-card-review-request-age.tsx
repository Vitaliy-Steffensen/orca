import React from 'react'
import { Eye } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useNow } from '@/hooks/use-now'
import { translate } from '@/i18n/i18n'
import { formatUiRelativeTime } from '@/i18n/relative-time-format'
import { formatShortTimeAgo } from '@/lib/short-time-ago'
import { useViewerReviewRequest } from '../workspace-status-rules/viewer-review-request-store'

/** The label only ever changes minute, hour and day; anything faster is wasted renders. */
const REVIEW_REQUEST_AGE_TICK_MS = 30_000

export function reviewRequestAgeLabel(
  requestedAt: number,
  isReRequest: boolean,
  now: number
): string {
  const age = formatShortTimeAgo(requestedAt, now)
  return isReRequest
    ? translate('auto.components.sidebar.reviewRequestAge.reAsked', 're-asked {{age}}', { age })
    : translate('auto.components.sidebar.reviewRequestAge.asked', 'asked {{age}}', { age })
}

export function WorktreeCardReviewRequestAge({
  worktreeId,
  enabled,
  className
}: {
  worktreeId: string
  enabled: boolean
  className?: string
}): React.JSX.Element | null {
  const request = useViewerReviewRequest(worktreeId)
  const now = useNow(REVIEW_REQUEST_AGE_TICK_MS, enabled && request !== null)
  if (!enabled || !request) {
    return null
  }
  const relative = formatUiRelativeTime(request.requestedAt - now)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="cardChipQuiet"
          className={className}
          data-worktree-card-review-request-age=""
        >
          <Eye aria-hidden="true" />
          {reviewRequestAgeLabel(request.requestedAt, request.isReRequest, now)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {request.isReRequest
          ? translate(
              'auto.components.sidebar.reviewRequestAge.reAskedTooltip',
              'Review requested again {{relative}} — you had already been asked on this pull request',
              { relative }
            )
          : translate(
              'auto.components.sidebar.reviewRequestAge.askedTooltip',
              'You were asked to review {{relative}}',
              { relative }
            )}
      </TooltipContent>
    </Tooltip>
  )
}
