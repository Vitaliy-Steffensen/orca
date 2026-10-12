import { useLayoutEffect, useState } from 'react'
import { GitHistoryPanel } from '../sync/git-history-panel'
import { shouldShowSourceControlCompareUnavailableCard } from './header-toolbar'
import { trackDockScrollPadding } from './dock-scroll-padding'
import { HideSectionContextMenu } from '../listing/section-chrome'
import { toggleSourceControlSectionHidden } from '../../../../../../shared/source-control-sections'
import { shouldRenderCommitArea } from '../commit/component-gates'
import { SourceControlBranchSection } from '../listing/branch-section'
import { SourceControlAllChangesSection } from '../listing/all-changes-section'
import { changesFilterBadge, clearChangesFilter } from '@/lib/changes-filter'
import { SourceControlContentStatus } from '../listing/content-status'
import {
  SourceControlFileCategoryFilter,
  shouldShowSourceControlFileCategoryFilter
} from '../listing/file-category-filter'
import { SourceControlUncommittedSections } from '../listing/uncommitted-sections'
import { CompareUnavailable } from '../sync/compare-summary'
import { SourceControlCommitSurface } from './commit-surface'
import { SourceControlForkPushNotice } from './fork-push-notice'
import type { SourceControlPanelReadyProps } from './panel-props'

/** The scrolling surface: status, commit affordances, the file sections and the history dock. */
export function SourceControlPanelContent(props: SourceControlPanelReadyProps) {
  const { activeWorktree, currentWorktreeId, model, worktreePath } = props
  const {
    settings,
    updateSettings,
    allChangeEntries,
    changesFilter,
    openAllChangesEntry,
    showAllChanges,
    totalAllChangeCount,
    visibleAllChangesTreeRows,
    activeConnectionId,
    activeOpenRowKeys,
    activeOpenRowKey,
    branchEntries,
    branchSummary,
    collapsedSections,
    collapsedTreeDirs,
    conflictOperation,
    diffCommentCountByPath,
    reviewThreadCountByPath,
    pendingReviewCountByPath,
    displaySections,
    expandedSubmoduleKeys,
    fileFilterState,
    fileListScrollElement,
    filterQuery,
    filteredBranchEntries,
    filteredGrouped,
    gitHistoryState,
    handleAbortOperationForConflict,
    handleCommitAction,
    handleContextMenu,
    handleOpenDiff,
    handleResolveConflictsWithAI,
    handleSelect,
    handleStage,
    handleStageAllPaths,
    handleStageSectionPaths,
    handleStageWorktreeChanges,
    handleUnstage,
    handleUnstagePaths,
    hasUncommittedEntries,
    hiddenFileCategories,
    isAbortingOperation,
    isCategoryFilterActive,
    isExecutingBulk,
    isGitHistoryVisible,
    loadCommitFiles,
    normalizedFilter,
    openAllDiffs,
    openBranchAllDiffs,
    openCommitFile,
    openCommittedDiff,
    openConflictReview,
    openHistoryCommitDiff,
    presentFileCategories,
    refreshActiveGitStatus,
    refreshBranchCompare,
    refreshGitHistory,
    repositoryHuge,
    requestDiscardAllInArea,
    requestDiscardEntry,
    requestDiscardPaths,
    revealInExplorer,
    selectedKeySet,
    setBaseRefDialogOpen,
    sourceControlAiActionsVisible,
    sourceControlViewMode,
    toggleFileCategory,
    toggleSection,
    toggleSubmodule,
    toggleTreeDir,
    unresolvedConflictReviewEntries,
    unresolvedConflicts,
    unfilteredDisplaySectionsById,
    visibleBranchTreeRows,
    visibleListRowsBySection,
    visibleTreeRowsBySection
  } = model

  const hasFilteredUncommittedEntries =
    filteredGrouped.staged.length > 0 ||
    filteredGrouped.unstaged.length > 0 ||
    filteredGrouped.untracked.length > 0
  const hasFilteredBranchEntries = filteredBranchEntries.length > 0
  const showGenericEmptyState =
    !hasUncommittedEntries && branchSummary?.status === 'ready' && branchEntries.length === 0
  const [dock, setDock] = useState<HTMLDivElement | null>(null)
  useLayoutEffect(
    () =>
      fileListScrollElement && dock
        ? trackDockScrollPadding(fileListScrollElement, dock)
        : undefined,
    [dock, fileListScrollElement]
  )
  const sectionLayout = settings?.sourceControlSectionLayout
  const hiddenSections = sectionLayout?.hidden ?? []
  const changesHidden = hiddenSections.includes('changes')
  const commitsHidden = hiddenSections.includes('commits')
  const hideCommits = (): void => {
    void updateSettings({
      sourceControlSectionLayout: {
        ...sectionLayout,
        hidden: toggleSourceControlSectionHidden(hiddenSections, 'commits')
      }
    })
  }

  return (
    <>
      <SourceControlContentStatus
        unresolvedConflictCount={unresolvedConflictReviewEntries.length}
        conflictOperation={conflictOperation}
        sourceControlAiActionsVisible={sourceControlAiActionsVisible}
        isAbortingOperation={isAbortingOperation}
        onAbortOperation={handleAbortOperationForConflict}
        onResolveWithAi={() => void handleResolveConflictsWithAI()}
        onReviewConflicts={() => {
          openConflictReview(
            currentWorktreeId,
            worktreePath,
            unresolvedConflictReviewEntries,
            'live-summary'
          )
        }}
        repositoryHuge={repositoryHuge}
        worktreeId={currentWorktreeId}
        onRetryStatus={refreshActiveGitStatus}
        onStageAllChanges={handleStageWorktreeChanges}
        isExecutingBulk={isExecutingBulk}
        showGenericEmptyState={showGenericEmptyState}
        normalizedFilter={normalizedFilter}
        branchBaseRef={branchSummary?.baseRef ?? null}
        filterTooLarge={fileFilterState.tooLarge}
        hasFilteredUncommittedEntries={hasFilteredUncommittedEntries}
        hasFilteredBranchEntries={hasFilteredBranchEntries}
        filterQuery={filterQuery}
        isCategoryFilterActive={isCategoryFilterActive}
      />

      <SourceControlForkPushNotice pushTarget={activeWorktree.pushTarget ?? null} />

      {shouldRenderCommitArea(unresolvedConflicts.length, conflictOperation) && (
        <SourceControlCommitSurface {...props} showGenericEmptyState={showGenericEmptyState} />
      )}

      {!showAllChanges &&
        shouldShowSourceControlFileCategoryFilter(
          presentFileCategories,
          isCategoryFilterActive
        ) && (
          <SourceControlFileCategoryFilter
            presentFileCategories={presentFileCategories}
            hiddenFileCategories={hiddenFileCategories}
            isCategoryFilterActive={isCategoryFilterActive}
            onToggleFileCategory={toggleFileCategory}
          />
        )}

      {/* Why also when empty under a filter: the filters live in this header, so they must stay reachable. */}
      {showAllChanges &&
        !changesHidden &&
        (allChangeEntries.length > 0 || isCategoryFilterActive || changesFilter) && (
          <SourceControlAllChangesSection
            baseRef={
              branchSummary?.status === 'ready' &&
              (!changesFilter || changesFilter.kind === 'uncommitted')
                ? branchSummary.baseRef
                : null
            }
            entries={allChangeEntries}
            totalEntryCount={totalAllChangeCount}
            collapsed={collapsedSections.has('all-changes')}
            onToggle={() => toggleSection('all-changes')}
            sourceControlViewMode={sourceControlViewMode}
            visibleTreeRows={visibleAllChangesTreeRows}
            fileListScrollElement={fileListScrollElement}
            collapsedTreeDirs={collapsedTreeDirs}
            toggleTreeDir={toggleTreeDir}
            currentWorktreeId={currentWorktreeId}
            worktreePath={worktreePath}
            revealInExplorer={revealInExplorer}
            activeConnectionId={activeConnectionId}
            onOpen={openAllChangesEntry}
            headerActions={
              shouldShowSourceControlFileCategoryFilter(
                presentFileCategories,
                isCategoryFilterActive
              ) ? (
                <SourceControlFileCategoryFilter
                  compact
                  presentFileCategories={presentFileCategories}
                  hiddenFileCategories={hiddenFileCategories}
                  isCategoryFilterActive={isCategoryFilterActive}
                  onToggleFileCategory={toggleFileCategory}
                />
              ) : null
            }
            filterBadge={changesFilterBadge(changesFilter)}
            onClearFilter={() => clearChangesFilter(currentWorktreeId)}
            diffCommentCountByPath={diffCommentCountByPath}
            reviewThreadCountByPath={reviewThreadCountByPath}
            pendingReviewCountByPath={pendingReviewCountByPath}
            activeOpenRowKeys={activeOpenRowKeys}
            activeOpenRowKey={activeOpenRowKey}
          />
        )}

      {hasFilteredUncommittedEntries && !showAllChanges && !changesHidden && (
        <SourceControlUncommittedSections
          displaySections={displaySections}
          unfilteredDisplaySectionsById={unfilteredDisplaySectionsById}
          normalizedFilter={normalizedFilter}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          onViewSection={(sectionViewAction) => {
            if (sectionViewAction.kind === 'conflict-review') {
              openConflictReview(
                currentWorktreeId,
                worktreePath,
                sectionViewAction.entries,
                'live-summary'
              )
            } else {
              openAllDiffs(
                currentWorktreeId,
                worktreePath,
                undefined,
                sectionViewAction.area,
                sectionViewAction.entries
              )
            }
          }}
          isExecutingBulk={isExecutingBulk}
          requestDiscardAllInArea={requestDiscardAllInArea}
          handleStageAllPaths={handleStageAllPaths}
          handleStageSectionPaths={handleStageSectionPaths}
          isStatusTruncated={repositoryHuge !== undefined}
          handleUnstagePaths={handleUnstagePaths}
          sourceControlViewMode={sourceControlViewMode}
          visibleTreeRowsBySection={visibleTreeRowsBySection}
          visibleListRowsBySection={visibleListRowsBySection}
          fileListScrollElement={fileListScrollElement}
          collapsedTreeDirs={collapsedTreeDirs}
          toggleTreeDir={toggleTreeDir}
          requestDiscardPaths={requestDiscardPaths}
          expandedSubmoduleKeys={expandedSubmoduleKeys}
          toggleSubmodule={toggleSubmodule}
          currentWorktreeId={currentWorktreeId}
          worktreePath={worktreePath}
          selectedKeySet={selectedKeySet}
          activeOpenRowKeys={activeOpenRowKeys}
          activeOpenRowKey={activeOpenRowKey}
          handleSelect={handleSelect}
          handleContextMenu={handleContextMenu}
          revealInExplorer={revealInExplorer}
          activeConnectionId={activeConnectionId}
          handleOpenDiff={handleOpenDiff}
          handleStage={handleStage}
          handleUnstage={handleUnstage}
          requestDiscardEntry={requestDiscardEntry}
          diffCommentCountByPath={diffCommentCountByPath}
          reviewThreadCountByPath={reviewThreadCountByPath}
          pendingReviewCountByPath={pendingReviewCountByPath}
        />
      )}

      {shouldShowSourceControlCompareUnavailableCard(
        branchSummary,
        hasUncommittedEntries,
        branchEntries.length > 0,
        Boolean(normalizedFilter)
      ) && branchSummary ? (
        <CompareUnavailable
          summary={branchSummary}
          onChangeBaseRef={() => setBaseRefDialogOpen(true)}
          onRetry={() => void refreshBranchCompare()}
        />
      ) : null}

      {branchSummary?.status === 'ready' &&
        hasFilteredBranchEntries &&
        !showAllChanges &&
        !changesHidden && (
          <SourceControlBranchSection
            activeOpenRowKeys={activeOpenRowKeys}
            activeOpenRowKey={activeOpenRowKey}
            branchSummary={branchSummary}
            filteredBranchEntries={filteredBranchEntries}
            totalBranchEntryCount={branchEntries.length}
            collapsedSections={collapsedSections}
            toggleSection={toggleSection}
            sourceControlViewMode={sourceControlViewMode}
            visibleBranchTreeRows={visibleBranchTreeRows}
            fileListScrollElement={fileListScrollElement}
            collapsedTreeDirs={collapsedTreeDirs}
            toggleTreeDir={toggleTreeDir}
            currentWorktreeId={currentWorktreeId}
            worktreePath={worktreePath}
            revealInExplorer={revealInExplorer}
            activeConnectionId={activeConnectionId}
            openCommittedDiff={openCommittedDiff}
            openBranchAllDiffs={openBranchAllDiffs}
            diffCommentCountByPath={diffCommentCountByPath}
            reviewThreadCountByPath={reviewThreadCountByPath}
            pendingReviewCountByPath={pendingReviewCountByPath}
          />
        )}

      {isGitHistoryVisible && !commitsHidden && (
        // Why: the graph is reference context, so keep it docked at the bottom as the pane scrolls.
        <HideSectionContextMenu onHide={hideCommits}>
          <div
            ref={setDock}
            className="sticky bottom-0 z-10 mt-auto shrink-0 border-t border-border bg-sidebar/95 backdrop-blur-sm"
          >
            <GitHistoryPanel
              state={gitHistoryState}
              collapsed={collapsedSections.has('history')}
              onToggle={() => toggleSection('history')}
              onRefresh={() => void refreshGitHistory()}
              onOpenCommit={(item) => void openHistoryCommitDiff(item)}
              onLoadCommitFiles={loadCommitFiles}
              onOpenCommitFile={openCommitFile}
              onCommitAction={handleCommitAction}
            />
          </div>
        </HideSectionContextMenu>
      )}
    </>
  )
}
