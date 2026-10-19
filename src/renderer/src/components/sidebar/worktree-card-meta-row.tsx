import React from 'react'
import { GitMerge } from 'lucide-react'

import { DetachedHeadBadge } from '@/components/DetachedHeadBadge'
import { Badge } from '@/components/ui/badge'
import CacheTimer from './CacheTimer'
import { WorktreeHostContextBadge } from './WorktreeHostContextBadge'
import { CONFLICT_OPERATION_LABELS } from './WorktreeCardHelpers'
import { TruncatedSidebarLabel } from './truncated-sidebar-label'
import { WorktreeCardReviewRequestAge } from './worktree-card-review-request-age'
import type { WorktreeCardPresentation } from './worktree-card-presentation'
import type { WorktreeCardController } from './use-worktree-card-controller'

export function WorktreeCardMetaRow({
  card,
  presentation
}: {
  card: WorktreeCardController
  presentation: WorktreeCardPresentation
}): React.JSX.Element {
  const {
    hostContextLabel,
    identityDisplay,
    detachedHeadDisplay,
    conflictOperation,
    cacheStartedAt,
    cacheTtlMs
  } = card
  const {
    showHostContextBadge,
    showIdentityInNewCard,
    hasHoverDetails,
    showDetachedHeadInMetaRow,
    showConflictOperationBadge,
    showReviewRequestAge
  } = presentation

  return (
    <div className="flex items-center gap-1.5 min-w-0" data-worktree-card-meta-row="">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        {showHostContextBadge && <WorktreeHostContextBadge label={hostContextLabel!} />}

        {showIdentityInNewCard ? (
          <TruncatedSidebarLabel
            text={identityDisplay!}
            className="text-[11px] text-muted-foreground leading-none"
            // Why: whole-card details hover already shows full identity; a nested tooltip would compete for it.
            tooltipEnabled={!hasHoverDetails}
          />
        ) : showDetachedHeadInMetaRow && detachedHeadDisplay ? (
          <DetachedHeadBadge
            display={detachedHeadDisplay}
            label="sidebar"
            side="right"
            className="h-[16px]"
          />
        ) : null}

        {showConflictOperationBadge && (
          <Badge variant="cardChipWarn">
            <GitMerge className="size-2.5" />
            {CONFLICT_OPERATION_LABELS[conflictOperation]}
          </Badge>
        )}

        {cacheStartedAt != null && <CacheTimer startedAt={cacheStartedAt} ttlMs={cacheTtlMs} />}
      </div>

      <WorktreeCardReviewRequestAge worktreeId={card.worktree.id} enabled={showReviewRequestAge} />
    </div>
  )
}
