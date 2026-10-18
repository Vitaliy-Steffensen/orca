import React from 'react'
import { GitBranch, Moon } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import { getWorktreeStatusLabel, type WorktreeStatus } from '@/lib/worktree-status'
import StatusIndicator from './StatusIndicator'
import { useWorktreeActivityStatus } from './use-worktree-activity-status'
import { useIsSleepingWorktree } from './use-worktree-sleep-state'
import type { WorktreeCardPrDisplay } from './worktree-card-pr-display'
import { getReviewLabel, ReviewIcon } from './worktree-review-helpers'
import type { WorkspaceReviewChecksSummary } from '../../../../shared/workspace-review-checks'
import {
  WorkspaceReviewChecksIndicator,
  workspaceReviewChecksLabel
} from './WorkspaceReviewChecksIndicator'

type WorktreeCardStatusSlotProps = {
  worktreeId: string
  showStatus: boolean
  isUnread: boolean
  prDisplay?: WorktreeCardPrDisplay | null
  reviewChecks?: WorkspaceReviewChecksSummary
  hasBranchIdentity?: boolean
  branchIdentityLabel?: string
  className?: string
}

const QUIET_REVIEW_REPLACEABLE_STATUSES = new Set<WorktreeStatus>(['active', 'done', 'inactive'])
// Why: a missing review display can also mean provider state is unavailable,
// so the passive label names the identity cue without claiming no review exists.
function getDefaultBranchIdentityLabel(): string {
  return translate('auto.components.sidebar.WorktreeCardStatusSlot.branchIdentity', 'Branch')
}
function getSleepingStatusLabel(): string {
  return translate('auto.components.sidebar.WorktreeCardStatusSlot.sleeping', 'Sleeping')
}
// Why: branch-style SVGs are optically left-heavy; this keeps them aligned with
// the centered activity dots in the shared status column.
const reviewAndBranchStatusIconClassName = 'size-[13px] translate-x-px'
const branchStatusIconClassName = `${reviewAndBranchStatusIconClassName} text-muted-foreground/70`
// Why no faint tint here: the sleeping row is dimmed as a whole, so the glyph
// keeps full muted-foreground and dims with everything around it.
const sleepingStatusIconClassName = 'size-[13px] text-muted-foreground'
// Why: a left-edge badge overlays unread on the status glyph without widening
// the lane or indenting the title; ring-sidebar cuts the dot out from busy icons.
const unreadAlertClassName =
  'pointer-events-none absolute left-0 top-1/2 size-[6px] -translate-y-1/2 rounded-full bg-amber-500 ring-2 ring-sidebar'

function overlayUnreadStatus(
  status: React.JSX.Element,
  showUnreadAlert: boolean
): React.JSX.Element {
  if (!showUnreadAlert) {
    return status
  }

  return (
    <span
      data-worktree-status-lane-unread=""
      className="relative inline-flex size-5 shrink-0 items-center justify-center"
    >
      {status}
      <span data-worktree-unread-alert="" className={unreadAlertClassName} aria-hidden="true" />
    </span>
  )
}

function getReviewStatusLabel(review: WorktreeCardPrDisplay): string {
  const label = getReviewLabel(review)
  if (review.state === 'merged') {
    return `${label}: Merged`
  }
  if (review.state === 'closed') {
    return `${label}: Closed`
  }
  if (review.state === 'draft') {
    return `${label}: Draft`
  }
  if (review.status === 'failure') {
    return `${label} checks: Failed`
  }
  if (review.status === 'pending') {
    return `${label} checks: Pending`
  }
  if (review.status === 'success') {
    return `${label} checks: Passing`
  }
  return `${label}: Open`
}

export function WorktreeCardStatusSlot({
  worktreeId,
  showStatus,
  isUnread,
  prDisplay = null,
  reviewChecks,
  hasBranchIdentity = false,
  branchIdentityLabel,
  className
}: WorktreeCardStatusSlotProps): React.JSX.Element | null {
  const collectionChecks = reviewChecks && reviewChecks.total > 1 ? reviewChecks : undefined
  const status = useWorktreeActivityStatus(worktreeId)
  const isSleeping = useIsSleepingWorktree(worktreeId)
  const statusLabel = getWorktreeStatusLabel(status) || status
  // Why: sleep must stay distinct from awake completion; a sleeping workspace
  // never collapses into branch/PR, even when retained done rows keep its
  // status at 'done'. Attention states keep their own glyphs by construction.
  const canShowSleepingStatus =
    showStatus && isSleeping && QUIET_REVIEW_REPLACEABLE_STATUSES.has(status)
  const canShowReviewStatus =
    showStatus &&
    (prDisplay !== null || Boolean(collectionChecks)) &&
    !canShowSleepingStatus &&
    QUIET_REVIEW_REPLACEABLE_STATUSES.has(status)
  const canShowBranchStatus =
    showStatus &&
    hasBranchIdentity &&
    prDisplay === null &&
    !collectionChecks &&
    !canShowSleepingStatus &&
    QUIET_REVIEW_REPLACEABLE_STATUSES.has(status)
  const passiveStatusLabel = canShowSleepingStatus
    ? getSleepingStatusLabel()
    : canShowReviewStatus && collectionChecks
      ? workspaceReviewChecksLabel(collectionChecks)
      : canShowReviewStatus && prDisplay
        ? getReviewStatusLabel(prDisplay)
        : canShowBranchStatus
          ? (branchIdentityLabel ?? getDefaultBranchIdentityLabel())
          : statusLabel
  const passiveStatusAnnouncement = isUnread ? `${passiveStatusLabel} · Unread` : passiveStatusLabel
  // Why: working and permission already own the status lane, but unread state
  // should still surface to assistive technology and reappear afterward.
  const showUnreadAlert = isUnread && showStatus && status !== 'working' && status !== 'permission'
  const branchStatusIcon = <GitBranch className={branchStatusIconClassName} aria-hidden="true" />
  const sleepingStatusIcon = <Moon className={sleepingStatusIconClassName} aria-hidden="true" />

  if (!showStatus) {
    return null
  }

  const passiveStatus = canShowSleepingStatus ? (
    <span className={cn('inline-flex size-5 items-center justify-center p-0.5', className)}>
      {sleepingStatusIcon}
      <span className="sr-only">{passiveStatusAnnouncement}</span>
    </span>
  ) : canShowReviewStatus && (collectionChecks || prDisplay) ? (
    <span className={cn('inline-flex size-5 items-center justify-center p-0.5', className)}>
      {collectionChecks ? (
        <WorkspaceReviewChecksIndicator
          summary={collectionChecks}
          className={reviewAndBranchStatusIconClassName}
        />
      ) : prDisplay ? (
        <ReviewIcon
          review={prDisplay}
          className={reviewAndBranchStatusIconClassName}
          variant="generic"
        />
      ) : null}
      <span className="sr-only">{passiveStatusAnnouncement}</span>
    </span>
  ) : canShowBranchStatus ? (
    <span className={cn('inline-flex size-5 items-center justify-center p-0.5', className)}>
      {branchStatusIcon}
      <span className="sr-only">{passiveStatusAnnouncement}</span>
    </span>
  ) : (
    <>
      <span className={cn('inline-flex size-5 items-center justify-center', className)}>
        <StatusIndicator status={status} aria-hidden="true" tooltipSide="right" />
      </span>
      <span className="sr-only">{passiveStatusAnnouncement}</span>
    </>
  )

  return overlayUnreadStatus(passiveStatus, showUnreadAlert)
}
