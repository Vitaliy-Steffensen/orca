import { useEffect } from 'react'
import { syncLatestAgentTurn } from '@/lib/changes-filter'
import { BulkActionBar } from '../commit/bulk-action-bar'
import { SourceControlHeaderToolbar } from './header-toolbar'
import { ChangedFilesFindBar } from '../../file-find/ChangedFilesFindBar'
import { SearchFilters } from '../../SearchFilters'
import { SearchResultsPane } from '../../SearchResultsPane'
import { SourceControlPendingReviewShelf } from '../pending-review/pending-review-shelf'
import { SourceControlPendingCommentsSection } from '../pending-review/pending-comments-section'
import { AgentNotesShelf } from '../notes/agent-notes-shelf'
import { AgentTurnsSection, useAgentTurns } from '../agent-turns/agent-turns-section'
import { useWorktreeAgentNotes } from '@/lib/agent-notes'
import { usePendingReviewQueue } from '@/components/pending-review/use-pending-review-queue'
import { useSubmitReviewVerdict } from '@/components/pending-review/use-submit-review-verdict'
import { SourceControlPanelContent } from './panel-content'
import { SourceControlStackedSections, type StackedSection } from './stacked-sections'
import { SourceControlCommitsSection } from './commits-section'
import { SourceControlPanelDialogs } from './panel-dialogs'
import type { SourceControlPanelReadyProps } from './panel-props'
import {
  moveSourceControlSection,
  orderSourceControlSections,
  toggleSourceControlSectionHidden,
  type MovableSourceControlSectionId
} from '../../../../../../shared/source-control-sections'

/** The panel chrome: toolbar, review and agent-notes shelves, the file surface, bulk bar and dialogs. */
export function SourceControlPanelReady(props: SourceControlPanelReadyProps) {
  const { model, worktreePath } = props
  const pendingReviewQueue = usePendingReviewQueue(props.model.activeWorktreeId ?? null)
  const submitReviewVerdict = useSubmitReviewVerdict(
    props.model.activeWorktreeId ?? null,
    pendingReviewQueue
  )
  const {
    activeConnectionId,
    activeWorktreeId,
    branchLineTotal,
    branchSummary,
    bulkStagePaths,
    bulkUnstagePaths,
    clearSelection,
    collapsedSections,
    compareBaseRef,
    contentSearch,
    filterExpanded,
    filterQuery,
    findMode,
    setFindMode,
    gitIdentityDisplay,
    handleBulkStage,
    handleBulkUnstage,
    handleCreatePrHeaderClick,
    handleOpenComment,
    handleRelinkSuppressedGitHubPR,
    handleSourceControlKeyDown,
    handleToggleSourceControlGrouping,
    handleToggleSourceControlViewMode,
    hostedReview,
    isCreatePrIntentInFlight,
    isCreatingPr,
    isExecutingBulk,
    manualReviewUrl,
    openHostedReviewInChecks,
    prGenerating,
    refreshBranchCompare,
    selectedKeys,
    setBaseRefDialogOpen,
    setFileListScrollElement,
    setFilterExpanded,
    setFilterQuery,
    setSourceControlRoot,
    settings,
    sourceControlGrouping,
    sourceControlViewMode,
    suppressedGitHubPRState,
    toggleSection,
    updateSettings
  } = model

  const agentNoteCount = useWorktreeAgentNotes(activeWorktreeId).length
  const agentTurns = useAgentTurns(worktreePath ?? '')
  const latestTurnOid = agentTurns[0]?.oid ?? null
  useEffect(() => {
    // Why only with a turn in hand: the list is empty while it loads, which says nothing about latest.
    if (activeWorktreeId && latestTurnOid) {
      syncLatestAgentTurn(activeWorktreeId, latestTurnOid)
    }
  }, [activeWorktreeId, latestTurnOid])

  // Fork: your own notes live in the diff viewer only; agent notes keep a section here.
  const shelves: StackedSection[] = []
  // Why not gated on drafts: a verdict stands on its own — an approve needs no comments.
  if (submitReviewVerdict.prNumber !== null) {
    shelves.push({
      id: 'pending-review',
      node: (
        <SourceControlPendingReviewShelf
          queue={pendingReviewQueue}
          submitter={submitReviewVerdict}
          worktreeId={props.model.activeWorktreeId ?? null}
          collapsed={collapsedSections.has('pending-review')}
          onToggle={() => toggleSection('pending-review')}
        />
      )
    })
  }
  if (pendingReviewQueue.comments.length > 0) {
    shelves.push({
      id: 'pending-comments',
      node: (
        <SourceControlPendingCommentsSection
          queue={pendingReviewQueue}
          collapsed={collapsedSections.has('pending-comments')}
          onToggle={() => toggleSection('pending-comments')}
        />
      )
    })
  }
  if (activeWorktreeId && worktreePath && agentNoteCount > 0) {
    shelves.push({
      id: 'agent-notes',
      node: <AgentNotesShelf worktreeId={activeWorktreeId} onOpenNote={handleOpenComment} />
    })
  }
  if (activeWorktreeId && worktreePath && !activeConnectionId && agentTurns.length > 0) {
    shelves.push({
      id: 'agent-turns',
      node: (
        <AgentTurnsSection
          worktreeId={activeWorktreeId}
          worktreePath={worktreePath}
          turns={agentTurns}
          collapsed={collapsedSections.has('agent-turns')}
          onToggle={() => toggleSection('agent-turns')}
        />
      )
    })
  }
  // Fork: the user's section order and hidden sections (`shared/source-control-sections.ts`).
  const sectionLayout = settings?.sourceControlSectionLayout
  const hiddenSections = sectionLayout?.hidden ?? []
  const sectionOrder = orderSourceControlSections(sectionLayout?.order)
  const visibleShelves = shelves.filter((shelf) => !hiddenSections.includes(shelf.id))
  const moveSection = (
    id: MovableSourceControlSectionId,
    beforeId: MovableSourceControlSectionId | null
  ): void => {
    void updateSettings({
      sourceControlSectionLayout: {
        ...sectionLayout,
        order: moveSourceControlSection(sectionOrder, id, beforeId)
      }
    })
  }
  const hideSection = (id: MovableSourceControlSectionId): void => {
    void updateSettings({
      sourceControlSectionLayout: {
        ...sectionLayout,
        hidden: toggleSourceControlSectionHidden(hiddenSections, id)
      }
    })
  }

  return (
    <>
      <div
        ref={setSourceControlRoot}
        className="relative flex h-full flex-col overflow-hidden"
        onKeyDown={handleSourceControlKeyDown}
      >
        <SourceControlHeaderToolbar
          filterQuery={filterQuery}
          filterExpanded={filterExpanded}
          onFilterExpandedChange={setFilterExpanded}
          // Fork: PRs are opened by the agent or the CLI, so the header offers no Create PR.
          visibleCreatePrHeaderAction={null}
          hostedReview={hostedReview}
          isCreatePrIntentInFlight={isCreatePrIntentInFlight}
          isCreatingPr={isCreatingPr || prGenerating}
          onCreatePrHeaderClick={handleCreatePrHeaderClick}
          onOpenHostedReviewInChecks={openHostedReviewInChecks}
          suppressedGitHubPRNumber={
            suppressedGitHubPRState?.status === 'matched' ? suppressedGitHubPRState.number : null
          }
          onRelinkSuppressedGitHubPR={handleRelinkSuppressedGitHubPR}
          sourceControlViewMode={sourceControlViewMode}
          viewModeToggleDisabled={settings === null}
          onToggleViewMode={handleToggleSourceControlViewMode}
          sourceControlGrouping={sourceControlGrouping}
          onToggleGrouping={handleToggleSourceControlGrouping}
          onChangeBaseRef={() => setBaseRefDialogOpen(true)}
          onRefreshBranchCompare={() => void refreshBranchCompare()}
          branchCompareRefreshDisabled={!branchSummary || branchSummary.status === 'loading'}
          branchSummary={branchSummary}
          branchLineTotal={branchLineTotal}
          compareBaseRef={compareBaseRef}
          headDisplay={gitIdentityDisplay}
          manualReviewUrl={manualReviewUrl}
        />

        <ChangedFilesFindBar
          mode={findMode}
          onModeChange={setFindMode}
          nameFilterQuery={filterQuery}
          onNameFilterChange={setFilterQuery}
          contentSearch={contentSearch.queryRowProps}
          testId="source-control-filter-input"
        />

        {findMode === 'contents' && filterExpanded ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-b border-border px-2 pb-1.5">
              <SearchFilters {...contentSearch.filtersProps} />
            </div>
            <div
              className="flex min-h-0 flex-1 flex-col"
              data-testid="source-control-content-search-results"
            >
              <SearchResultsPane {...contentSearch.resultsProps} />
            </div>
          </div>
        ) : (
          <SourceControlStackedSections
            shelves={visibleShelves}
            order={sectionOrder}
            onMove={moveSection}
            onHide={hideSection}
            scrollRef={setFileListScrollElement}
            scrollStyle={{ paddingBottom: selectedKeys.size > 0 ? 50 : undefined }}
            footer={<SourceControlCommitsSection model={model} />}
          >
            <SourceControlPanelContent {...props} />
          </SourceControlStackedSections>
        )}

        {selectedKeys.size > 0 && (
          <BulkActionBar
            selectedCount={selectedKeys.size}
            stageableCount={bulkStagePaths.length}
            unstageableCount={bulkUnstagePaths.length}
            onStage={handleBulkStage}
            onUnstage={handleBulkUnstage}
            onClear={clearSelection}
            isExecuting={isExecutingBulk}
          />
        )}
      </div>

      <SourceControlPanelDialogs {...props} />
    </>
  )
}
