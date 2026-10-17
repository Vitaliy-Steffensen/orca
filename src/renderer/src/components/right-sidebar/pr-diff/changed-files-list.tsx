import React, { useCallback, useState } from 'react'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { SourceControlAllChangesSection } from '../source-control/listing/all-changes-section'
import { CompareUnavailable } from '../source-control/sync/compare-summary'
import { FileFindBar } from '../file-find/FileFindBar'
import type { PrDiffModel } from './use-pr-diff-model'

const NO_COUNTS = new Map<string, number>()

/** The base-vs-now file list: a find bar, one row per changed path, and the degraded states. */
export function PrDiffChangedFilesList({ model }: { model: PrDiffModel }): React.JSX.Element {
  const revealInExplorer = useAppStore((s) => s.revealInExplorer)
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
      <FileFindBar
        expanded={find.expanded}
        onExpandedChange={find.setExpanded}
        mode="names"
        onModeChange={() => undefined}
        query={find.query}
        onQueryChange={find.setQuery}
        onClear={() => find.setQuery('')}
        focusRequestId={find.focusRequestId}
        placeholder={translate(
          'auto.components.right.sidebar.SourceControl.c35baf2f1e',
          'Filter files…'
        )}
        ariaLabel={translate(
          'auto.components.right.sidebar.SourceControl.c35baf2f1e',
          'Filter files…'
        )}
        testId="pr-diff-filter-input"
      />
      {unavailable ? (
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
              diffCommentCountByPath={NO_COUNTS}
              reviewThreadCountByPath={NO_COUNTS}
              pendingReviewCountByPath={NO_COUNTS}
              activeOpenRowKeys={model.activeOpenRowKeys}
              activeOpenRowKey={model.activeOpenRowKey}
            />
          )}
        </div>
      )}
    </div>
  )
}
