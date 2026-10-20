import React from 'react'
import { shouldShowSourceControlCompareUnavailableCard } from './header-toolbar'
import { SourceControlAllChangesSection } from '../listing/all-changes-section'
import {
  changesFilterBadge,
  clearChangesFilter,
  isChangesSourceFilter,
  type ChangesFilter
} from '@/lib/changes-filter'
import { SourceControlContentStatus } from '../listing/content-status'
import {
  SourceControlFileCategoryFilter,
  shouldShowSourceControlFileCategoryFilter
} from '../listing/file-category-filter'
import { SourceControlUncommittedSections } from '../listing/uncommitted-sections'
import type { SourceControlDisplaySectionId } from '../listing/section-order'
import { CompareUnavailable } from '../sync/compare-summary'
import { SourceControlForkPushNotice } from './fork-push-notice'
import type { SourceControlPanelMode, SourceControlPanelReadyProps } from './panel-props'

/**
 * Local changes always keeps the working tree split into Staged and Unstaged, so only a previewed
 * commit or turn — which lists files the working tree has no sections for — brings the flat list.
 */
export function shouldShowSourceControlAllChangesSection(
  mode: SourceControlPanelMode,
  changesFilter: ChangesFilter | null
): boolean {
  return mode === 'pull-request'
    ? !changesFilter
    : changesFilter !== null && isChangesSourceFilter(changesFilter)
}

/** The Changes section: status, commit affordances and the file sections. */
export function SourceControlPanelContent(props: SourceControlPanelReadyProps) {
  const { activeWorktree, currentWorktreeId, mode, model, worktreePath } = props
  const {
    settings,
    allChangeEntries,
    changesFilter,
    openAllChangesEntry,
    reviewByPath,
    viewedCount,
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
    commentCountsByPath,
    fileFilterState,
    fileListScrollElement,
    filterQuery,
    filteredBranchEntries,
    filteredGrouped,
    handleAbortOperationForConflict,
    handleResolveConflictsWithAI,
    handleStageWorktreeChanges,
    hasUncommittedEntries,
    hiddenFileCategories,
    isAbortingOperation,
    isCategoryFilterActive,
    isExecutingBulk,
    normalizedFilter,
    openConflictReview,
    presentFileCategories,
    refreshActiveGitStatus,
    refreshBranchCompare,
    repositoryHuge,
    revealInExplorer,
    setBaseRefDialogOpen,
    sourceControlAiActionsVisible,
    sourceControlViewMode,
    toggleFileCategory,
    toggleSection,
    toggleTreeDir,
    unresolvedConflictReviewEntries
  } = model

  const hasFilteredUncommittedEntries =
    filteredGrouped.staged.length > 0 ||
    filteredGrouped.unstaged.length > 0 ||
    filteredGrouped.untracked.length > 0
  const hasFilteredBranchEntries = filteredBranchEntries.length > 0
  const showGenericEmptyState =
    !hasUncommittedEntries && branchSummary?.status === 'ready' && branchEntries.length === 0
  const sectionLayout = settings?.sourceControlSectionLayout
  const hiddenSections = sectionLayout?.hidden ?? []
  const changesHidden = hiddenSections.includes('changes')

  return (
    <>
      {mode === 'local' && (
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
        </>
      )}

      {/* Why also when empty under a filter: the filters live in this header, so they must stay reachable. */}
      {!changesHidden &&
        shouldShowSourceControlAllChangesSection(mode, changesFilter) &&
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
            commentCountsByPath={commentCountsByPath}
            activeOpenRowKeys={activeOpenRowKeys}
            activeOpenRowKey={activeOpenRowKey}
            reviewByPath={reviewByPath}
            viewedCount={viewedCount}
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
    </>
  )
}

/** Staged, or conflicts plus unstaged and untracked, as one movable shelf. */
export function SourceControlWorkingTreeShelf({
  props,
  sectionIds
}: {
  props: SourceControlPanelReadyProps
  sectionIds: readonly SourceControlDisplaySectionId[]
}): React.JSX.Element | null {
  const { currentWorktreeId, model, worktreePath } = props
  const displaySections = model.displaySections.filter((section) => sectionIds.includes(section.id))
  if (displaySections.length === 0) {
    return null
  }
  return (
    <SourceControlUncommittedSections
      displaySections={displaySections}
      unfilteredDisplaySectionsById={model.unfilteredDisplaySectionsById}
      normalizedFilter={model.normalizedFilter}
      collapsedSections={model.collapsedSections}
      toggleSection={model.toggleSection}
      onViewSection={(sectionViewAction) => {
        if (sectionViewAction.kind === 'conflict-review') {
          model.openConflictReview(
            currentWorktreeId,
            worktreePath,
            sectionViewAction.entries,
            'live-summary'
          )
        } else {
          model.openAllDiffs(
            currentWorktreeId,
            worktreePath,
            undefined,
            sectionViewAction.area,
            sectionViewAction.entries
          )
        }
      }}
      isExecutingBulk={model.isExecutingBulk}
      requestDiscardAllInArea={model.requestDiscardAllInArea}
      handleStageAllPaths={model.handleStageAllPaths}
      handleStageSectionPaths={model.handleStageSectionPaths}
      isStatusTruncated={model.repositoryHuge !== undefined}
      handleUnstagePaths={model.handleUnstagePaths}
      sourceControlViewMode={model.sourceControlViewMode}
      visibleTreeRowsBySection={model.visibleTreeRowsBySection}
      visibleListRowsBySection={model.visibleListRowsBySection}
      fileListScrollElement={model.fileListScrollElement}
      collapsedTreeDirs={model.collapsedTreeDirs}
      toggleTreeDir={model.toggleTreeDir}
      requestDiscardPaths={model.requestDiscardPaths}
      expandedSubmoduleKeys={model.expandedSubmoduleKeys}
      toggleSubmodule={model.toggleSubmodule}
      currentWorktreeId={currentWorktreeId}
      worktreePath={worktreePath}
      selectedKeySet={model.selectedKeySet}
      activeOpenRowKeys={model.activeOpenRowKeys}
      activeOpenRowKey={model.activeOpenRowKey}
      handleSelect={model.handleSelect}
      handleContextMenu={model.handleContextMenu}
      revealInExplorer={model.revealInExplorer}
      activeConnectionId={model.activeConnectionId}
      handleOpenDiff={model.handleOpenDiff}
      handleStage={model.handleStage}
      handleUnstage={model.handleUnstage}
      requestDiscardEntry={model.requestDiscardEntry}
      commentCountsByPath={model.commentCountsByPath}
    />
  )
}
