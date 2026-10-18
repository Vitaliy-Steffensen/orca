import React from 'react'
import { GitPullRequestArrow, Loader2 } from 'lucide-react'
import type { GitBranchCompareSummary } from '../../../../../../shared/git-diff-compare-types'
import type { GitBranchLineTotal } from '../../../../../../shared/git-status-types'
import type { SourceControlViewMode } from '../../../../../../shared/ui-chrome-types'
import type { HostedReviewInfo } from '../../../../../../shared/hosted-review'
import type { PrimaryAction } from '../../source-control-primary-action'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PrimaryActionTooltip } from '../../source-control-primary-action-tooltip'
import { translate } from '@/i18n/i18n'
import type { WorktreeGitIdentityDisplay } from '@/lib/worktree-git-identity-display'
import { HostedReviewHeaderLink, HostedReviewIcon } from '../review/hosted-review-header-chrome'
import { SourceControlBranchContextRow } from './branch-context-row'
import { shouldShowSourceControlBranchContextChrome } from './branch-context-stats'
import { SourceControlHeaderOverflowMenu } from './header-overflow-menu'
import { FileFindToggle } from '../../file-find/FileFindToggle'

type SourceControlHeaderToolbarProps = {
  filterQuery: string
  filterExpanded: boolean
  onFilterExpandedChange: (expanded: boolean) => void
  visibleCreatePrHeaderAction: PrimaryAction | null
  hostedReview: HostedReviewInfo | null
  isCreatePrIntentInFlight: boolean
  isCreatingPr: boolean
  onCreatePrHeaderClick: () => void
  onOpenHostedReviewInChecks: () => void
  suppressedGitHubPRNumber: number | null
  onRelinkSuppressedGitHubPR: () => void
  sourceControlViewMode: SourceControlViewMode
  viewModeToggleDisabled: boolean
  onToggleViewMode: () => void
  onChangeBaseRef: () => void
  onRefreshBranchCompare: () => void
  branchCompareRefreshDisabled: boolean
  branchSummary: GitBranchCompareSummary | null
  compareBaseRef: string | null
  headDisplay?: WorktreeGitIdentityDisplay | null
  manualReviewUrl?: string | null
  branchLineTotal?: GitBranchLineTotal | null
}

function HostedReviewToolbarLink({
  review,
  onOpenHostedReviewInChecks,
  compact
}: {
  review: HostedReviewInfo
  onOpenHostedReviewInChecks: () => void
  compact?: boolean
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-1 text-[11.5px] leading-none',
        compact ? 'max-w-[72px] shrink-0' : 'flex-1'
      )}
    >
      <HostedReviewIcon review={review} className="size-3 shrink-0" />
      <HostedReviewHeaderLink
        review={review}
        onOpenHostedReviewInChecks={onOpenHostedReviewInChecks}
      />
    </div>
  )
}

function CreatePrHeaderButton({
  action,
  isCreatePrIntentInFlight,
  isCreatingPr,
  onClick
}: {
  action: PrimaryAction
  isCreatePrIntentInFlight: boolean
  isCreatingPr: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <PrimaryActionTooltip action={action} side="bottom">
      <span className="inline-flex shrink-0">
        <Button
          type="button"
          size="xs"
          disabled={action.disabled}
          onClick={onClick}
          className="h-6 shrink-0 px-2 text-[11px]"
        >
          {isCreatePrIntentInFlight || isCreatingPr ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <GitPullRequestArrow className="size-3.5" aria-hidden="true" />
          )}
          {action.label}
        </Button>
      </span>
    </PrimaryActionTooltip>
  )
}

function SuppressedGitHubPRToolbar({
  number,
  onRelink
}: {
  number: number
  onRelink: () => void
}): React.JSX.Element {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="truncate text-[11.5px] text-muted-foreground">
        {translate('sourceControl.unlinkedPr.status', 'PR #{{number}} unlinked', { number })}
      </span>
      <Button type="button" variant="outline" size="xs" onClick={onRelink} className="shrink-0">
        <GitPullRequestArrow className="size-3.5" aria-hidden="true" />
        {translate('checksPanel.unlinked.relink', 'Link PR #{{number}}', {
          number
        })}
      </Button>
    </div>
  )
}

function renderOverflowMenu(
  props: Pick<
    SourceControlHeaderToolbarProps,
    | 'sourceControlViewMode'
    | 'viewModeToggleDisabled'
    | 'onToggleViewMode'
    | 'onChangeBaseRef'
    | 'onRefreshBranchCompare'
    | 'branchCompareRefreshDisabled'
  >
): React.JSX.Element {
  return <SourceControlHeaderOverflowMenu {...props} />
}

export function SourceControlHeaderToolbar({
  filterQuery,
  filterExpanded,
  onFilterExpandedChange,
  visibleCreatePrHeaderAction,
  hostedReview,
  isCreatePrIntentInFlight,
  isCreatingPr,
  onCreatePrHeaderClick,
  onOpenHostedReviewInChecks,
  suppressedGitHubPRNumber,
  onRelinkSuppressedGitHubPR,
  sourceControlViewMode,
  viewModeToggleDisabled,
  onToggleViewMode,
  onChangeBaseRef,
  onRefreshBranchCompare,
  branchCompareRefreshDisabled,
  branchSummary,
  compareBaseRef,
  headDisplay = null,
  manualReviewUrl,
  branchLineTotal
}: SourceControlHeaderToolbarProps): React.JSX.Element {
  const normalizedFilter = filterQuery.trim()
  const overflowProps = {
    sourceControlViewMode,
    viewModeToggleDisabled,
    onToggleViewMode,
    onChangeBaseRef,
    onRefreshBranchCompare,
    branchCompareRefreshDisabled
  }

  const filterToggleTitle = normalizedFilter
    ? translate('auto.components.right.sidebar.SourceControl.c8e4a1f902', 'Filter: {{value0}}', {
        value0: filterQuery
      })
    : translate('auto.components.right.sidebar.SourceControl.b3c8f1a902', 'Filter files by name')

  return (
    <div className="border-b border-border px-3 pt-1.5 pb-1">
      <div
        className="flex min-w-0 items-center gap-1"
        data-filter-expanded={filterExpanded ? 'true' : 'false'}
      >
        {hostedReview ? (
          <HostedReviewToolbarLink
            review={hostedReview}
            onOpenHostedReviewInChecks={onOpenHostedReviewInChecks}
          />
        ) : suppressedGitHubPRNumber !== null ? (
          <SuppressedGitHubPRToolbar
            number={suppressedGitHubPRNumber}
            onRelink={onRelinkSuppressedGitHubPR}
          />
        ) : visibleCreatePrHeaderAction ? (
          <CreatePrHeaderButton
            action={visibleCreatePrHeaderAction}
            isCreatePrIntentInFlight={isCreatePrIntentInFlight}
            isCreatingPr={isCreatingPr}
            onClick={onCreatePrHeaderClick}
          />
        ) : (
          <span className="min-w-0 flex-1" aria-hidden="true" />
        )}
        {(visibleCreatePrHeaderAction || suppressedGitHubPRNumber !== null) && !hostedReview ? (
          // Why: keep filter/overflow pinned right without stretching Create PR.
          <span className="min-w-0 flex-1" aria-hidden="true" />
        ) : null}
        <FileFindToggle
          expanded={filterExpanded}
          onToggle={() => onFilterExpandedChange(!filterExpanded)}
          hasQuery={Boolean(normalizedFilter)}
          label={filterToggleTitle}
          testId="source-control-filter-toggle"
        />
        {renderOverflowMenu(overflowProps)}
      </div>

      {shouldShowSourceControlBranchContextChrome(branchSummary, compareBaseRef, headDisplay) ? (
        <div className="mt-1">
          <SourceControlBranchContextRow
            summary={branchSummary}
            compareBaseRef={compareBaseRef}
            headDisplay={headDisplay}
            manualReviewUrl={manualReviewUrl}
            branchLineTotal={branchLineTotal}
            onChangeBaseRef={onChangeBaseRef}
            onRetry={onRefreshBranchCompare}
          />
        </div>
      ) : null}
    </div>
  )
}

export function shouldShowSourceControlCompareUnavailableCard(
  summary: GitBranchCompareSummary | null | undefined,
  hasUncommittedEntries: boolean,
  hasBranchEntries: boolean,
  hasFilter: boolean
): boolean {
  if (!summary || summary.status === 'loading' || summary.status === 'ready' || hasFilter) {
    return false
  }
  return !hasUncommittedEntries && !hasBranchEntries
}

export function getNextSourceControlViewMode(mode: SourceControlViewMode): SourceControlViewMode {
  return mode === 'list' ? 'tree' : 'list'
}
