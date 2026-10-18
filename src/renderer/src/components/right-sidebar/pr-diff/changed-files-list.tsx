import React, { useCallback, useState } from 'react'
import { useAppStore } from '@/store'
import { useWorkspaceFileCommentCounts } from '@/components/diff-comments/file-comment-counts'
import { translate } from '@/i18n/i18n'
import { SourceControlAllChangesSection } from '../source-control/listing/all-changes-section'
import { CompareUnavailable } from '../source-control/sync/compare-summary'
import { ChangedFilesFindBar } from '../file-find/ChangedFilesFindBar'
import { SearchFilters } from '../SearchFilters'
import { SearchResultsPane } from '../SearchResultsPane'
import { PrDiffHeaderToolbar } from './header-toolbar'
import type { PrDiffModel } from './use-pr-diff-model'

/** The base-vs-now file list: a find bar, one row per changed path, and the degraded states. */
export function PrDiffChangedFilesList({ model }: { model: PrDiffModel }): React.JSX.Element {
  const revealInExplorer = useAppStore((s) => s.revealInExplorer)
  const commentCountsByPath = useWorkspaceFileCommentCounts(model.activeWorktreeId)
  const [collapsed, setCollapsed] = useState(false)
  const { allChanges, branchSummary, find } = model
  const toggleTreeDir = useCallback(
    (key: string) =>
      model.setCollapsedTreeDirs((prev) => {
        const next = new Set(prev)
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
        }
        return next
      }),
    [model]
  )

  const unavailable =
    branchSummary &&
    (branchSummary.status === 'invalid-base' ||
      branchSummary.status === 'no-merge-base' ||
      branchSummary.status === 'error')

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Why above the scroller: the unavailable and empty states replace it, and a magnifier
         hidden behind an empty result is the one time the user must be able to clear the filter. */}
      <PrDiffHeaderToolbar
        compareBaseRef={model.compareBaseRef}
        findExpanded={find.expanded}
        onToggleFind={() => find.setExpanded(!find.expanded)}
        hasQuery={Boolean(find.query.trim())}
        viewMode={model.sourceControlViewMode}
        viewModeToggleDisabled={model.viewModeToggleDisabled}
        onToggleViewMode={model.toggleViewMode}
      />
      <ChangedFilesFindBar
        mode={find.mode}
        onModeChange={find.setMode}
        nameFilterQuery={find.query}
        onNameFilterChange={find.setQuery}
        contentSearch={model.contentSearch.queryRowProps}
        testId="pr-diff-filter-input"
      />
      {find.mode === 'contents' && find.expanded ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="border-b border-border px-2 pb-1.5">
            <SearchFilters {...model.contentSearch.filtersProps} />
          </div>
          <div
            className="flex min-h-0 flex-1 flex-col"
            data-testid="pr-diff-content-search-results"
          >
            <SearchResultsPane {...model.contentSearch.resultsProps} />
          </div>
        </div>
      ) : unavailable ? (
        <CompareUnavailable
          summary={branchSummary}
          onChangeBaseRef={() => undefined}
          onRetry={() => void model.refreshBranchCompare()}
        />
      ) : (
        <div
          ref={model.setFileListScrollElement}
          className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto"
          data-testid="pr-diff-file-list"
        >
          {allChanges.allChangeEntries.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              {model.filter.normalizedFilter || model.filter.tooLarge
                ? translate('prDiff.noMatchingFiles', 'No changed files match the filter.')
                : translate('prDiff.noChanges', 'No changes against the base branch.')}
            </p>
          ) : (
            <SourceControlAllChangesSection
              baseRef={model.compareBaseRef}
              entries={allChanges.allChangeEntries}
              totalEntryCount={allChanges.totalAllChangeCount}
              collapsed={collapsed}
              onToggle={() => setCollapsed((prev) => !prev)}
              sourceControlViewMode={model.sourceControlViewMode}
              visibleTreeRows={allChanges.visibleAllChangesTreeRows}
              fileListScrollElement={model.fileListScrollElement}
              collapsedTreeDirs={model.collapsedTreeDirs}
              toggleTreeDir={toggleTreeDir}
              currentWorktreeId={model.activeWorktreeId ?? ''}
              worktreePath={model.worktreePath ?? ''}
              revealInExplorer={revealInExplorer}
              activeConnectionId={model.activeConnectionId}
              onOpen={model.openAllChangesEntry}
              commentCountsByPath={commentCountsByPath}
              activeOpenRowKeys={model.activeOpenRowKeys}
              activeOpenRowKey={model.activeOpenRowKey}
            />
          )}
        </div>
      )}
    </div>
  )
}
