import React from 'react'
import { getWorkspaceAttachments } from '../../../../shared/workspace-attachments'

import {
  getFlushWorktreeCardPaddingLeft,
  getStatusLaneParentContentMarginLeft
} from './worktree-list/rows/indentation'
import { hasWorktreeCardDetails, WorktreeCardMetaBadges } from './WorktreeCardMeta'
import { WorktreeCardChipRail } from './worktree-card-chip-rail'
import { resolveWorktreeCardChips } from './worktree-card-chips'
import { resolveWorktreeCardFacts } from './worktree-card-facts'
import { WorktreeCardPortsTrigger } from './WorktreeCardPorts'
import { WorktreeCardRunState } from './WorktreeCardRunState'
import type { WorktreeCardController } from './use-worktree-card-controller'

export function buildWorktreeCardPresentation(card: WorktreeCardController) {
  const {
    worktree,
    repo,
    inPinnedSection,
    hideRepoBadge,
    hidePinnedRepoIcon,
    hostContextLabel,
    flushSurface,
    contentIndent,
    isFolder,
    detachedHeadDisplay,
    identityDisplay,
    folderMetaRowContent,
    showIdentityInNewCard,
    conflictOperation,
    cardProps,
    cacheStartedAt,
    hasDetails,
    hasPorts,
    showStatus,
    showInlineAgentList,
    showLineageChildChip,
    remoteBranchConflict,
    visibleCardTitle,
    workspacePorts,
    referenceDetails,
    showPR,
    viewerReviewRequest,
    showIssue,
    showLinearIssue,
    showJiraIssue,
    metaIssue,
    metaLinearIssue,
    metaJiraIssue,
    metaComment,
    metaAutomationProvenance,
    metaCliProvenance,
    hoverIssue,
    hoverLinearIssue,
    hoverJiraIssue,
    hoverReview,
    hoverComment,
    showDeleteQuickAction,
    showRun,
    runState,
    hasWorkspaceRunAction
  } = card

  // Why: pinned trees mix repos, so the repo icon shows regardless of groupBy's hideRepoBadge.
  const showPinnedRepoIcon = inPinnedSection && !!repo && !hidePinnedRepoIcon
  const showInlineRepoBadge = !!repo && !hideRepoBadge && !isFolder && !showPinnedRepoIcon
  const showHostContextBadge = !!hostContextLabel && cardProps.includes('host')
  const showDetachedHeadInMetaRow = !isFolder && detachedHeadDisplay !== null
  // Why: rebases already surface in source control, so dense cards skip the persistent rebase chip.
  const showConflictOperationBadge =
    !!conflictOperation && conflictOperation !== 'unknown' && conflictOperation !== 'rebase'
  // Why: the slot owns the unread/status lane and keeps the glyph passive.
  const showCombinedStatusSlot = showStatus
  const chips = resolveWorktreeCardChips(card)
  const hasReviewFacts =
    resolveWorktreeCardFacts({
      cardProps,
      review: card.prDisplay && 'mergeable' in card.prDisplay ? card.prDisplay : null,
      linearPriority: card.linearIssue?.priority,
      branchLineTotal: card.branchLineTotal
    }).length > 0
  const showTitleRowIndicators = hasDetails || hasPorts || showRun || chips.length > 0
  const showReviewRequestAge = showPR && viewerReviewRequest !== null
  // Why: grouped views can hide the repo badge; don't reserve a blank metadata lane unless there's real content.
  const hasMetaRow = Boolean(
    showHostContextBadge ||
    folderMetaRowContent ||
    showIdentityInNewCard ||
    showDetachedHeadInMetaRow ||
    showConflictOperationBadge ||
    showReviewRequestAge ||
    cacheStartedAt != null
  )
  const showHeaderActions = showDeleteQuickAction || hasWorkspaceRunAction
  // Why: normalize the title once so identity-only hover eligibility stays in sync with the title.
  const trimmedVisibleCardTitle = visibleCardTitle.trim()
  const hoverBranchName = identityDisplay
  const hoverWorkspaceTitle =
    trimmedVisibleCardTitle.length > 0 && trimmedVisibleCardTitle !== hoverBranchName
      ? trimmedVisibleCardTitle
      : undefined
  const hasHoverIdentity = Boolean(hoverWorkspaceTitle || hoverBranchName)
  const allReferenceItems = getWorkspaceAttachments(worktree)
  const hasHoverDetails =
    allReferenceItems.length > 0 ||
    hasWorktreeCardDetails({
      issue: hoverIssue,
      linearIssue: hoverLinearIssue,
      jiraIssue: hoverJiraIssue,
      review: hoverReview,
      comment: hoverComment,
      automationProvenance: metaAutomationProvenance,
      cliProvenance: metaCliProvenance
    }) ||
    workspacePorts.length > 0 ||
    hasHoverIdentity
  // Why: the parent row owns metadata hover; don't stack the title's truncation tooltip on the details popover.
  const titleWrapper = hasHoverDetails
    ? (title: React.ReactElement): React.ReactElement => title
    : undefined
  // Why: sidebar rows need a small surface inset while content stays aligned with the pre-inset layout.
  const cardPaddingLeft = flushSurface
    ? getFlushWorktreeCardPaddingLeft(contentIndent, showCombinedStatusSlot)
    : contentIndent > 0
      ? `calc(0.125rem + ${contentIndent}px)`
      : null
  const parentContentMarginLeft =
    flushSurface && showCombinedStatusSlot ? getStatusLaneParentContentMarginLeft(contentIndent) : 0
  const cardStyle = cardPaddingLeft ? { paddingLeft: cardPaddingLeft } : undefined
  // Why: a lone review reference already has the status lane glyph, so only a stack of them earns a badge.
  const hasStackedReviewReferences =
    allReferenceItems.filter((candidate) => candidate.type !== 'issue').length > 1
  const referenceItems = allReferenceItems.filter((item) =>
    item.type !== 'issue'
      ? showPR && hasStackedReviewReferences
      : item.provider === 'linear'
        ? showLinearIssue
        : item.provider === 'jira'
          ? showJiraIssue
          : showIssue
  )
  const detailsAndPorts =
    hasDetails || hasPorts || showRun ? (
      <div className="flex shrink-0 items-center gap-1">
        {showRun && runState ? <WorktreeCardRunState state={runState} /> : null}
        {hasPorts && <WorktreeCardPortsTrigger ports={workspacePorts} />}
        {hasDetails && (
          <WorktreeCardMetaBadges
            referenceItems={referenceItems}
            referenceDetails={referenceDetails}
            issue={metaIssue}
            linearIssue={metaLinearIssue}
            jiraIssue={metaJiraIssue}
            review={null}
            comment={metaComment}
            automationProvenance={metaAutomationProvenance}
            cliProvenance={metaCliProvenance}
            className="ml-0 pr-0"
          />
        )}
      </div>
    ) : null
  const titleRowIndicators = showTitleRowIndicators ? (
    <div className="ml-auto flex shrink-0 items-center gap-1 pr-1.5">
      <WorktreeCardChipRail chips={chips} />
      {detailsAndPorts}
    </div>
  ) : null
  const hasSecondaryCardContent =
    hasMetaRow ||
    hasReviewFacts ||
    !!remoteBranchConflict ||
    showInlineAgentList ||
    showLineageChildChip
  const titleOnlyCard = !hasSecondaryCardContent

  return {
    showPinnedRepoIcon,
    showInlineRepoBadge,
    showHostContextBadge,
    showIdentityInNewCard,
    showDetachedHeadInMetaRow,
    showReviewRequestAge,
    showConflictOperationBadge,
    showCombinedStatusSlot,
    showTitleRowIndicators,
    hasMetaRow,
    showHeaderActions,
    showDeleteQuickAction,
    hoverBranchName,
    hoverWorkspaceTitle,
    hasHoverDetails,
    titleWrapper,
    parentContentMarginLeft,
    cardStyle,
    detailsAndPorts,
    titleRowIndicators,
    titleOnlyCard
  }
}

export type WorktreeCardPresentation = ReturnType<typeof buildWorktreeCardPresentation>
