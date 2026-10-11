import React from 'react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import type { GitBranchChangeEntry } from '../../../../../../shared/git-diff-compare-types'
import type { SourceControlViewMode } from '../../../../../../shared/ui-chrome-types'
import type { SourceControlTreeNode } from '../../source-control-tree'
import type { SourceControlRowOpenEvent } from './split-open'
import { BranchEntryRow } from './branch-entry-row'
import { SectionHeader } from './section-header'
import { formatSourceControlRefLabel } from '../panel/branch-context-stats'
import { SourceControlBranchTreeDirectoryRow } from './tree-directory-rows'
import { VirtualizedList } from '../../../virtualized-list'
import { ALL_CHANGES_AREA } from './all-changes'

export type AllChangesTreeNode = SourceControlTreeNode<
  GitBranchChangeEntry,
  typeof ALL_CHANGES_AREA
>

// Fork: one section for every file changed against the base, committed or not, each row showing
// the file as it is on disk now.
export function SourceControlAllChangesSection({
  baseRef,
  entries,
  totalEntryCount,
  collapsed,
  onToggle,
  sourceControlViewMode,
  visibleTreeRows,
  fileListScrollElement,
  collapsedTreeDirs,
  toggleTreeDir,
  currentWorktreeId,
  worktreePath,
  revealInExplorer,
  activeConnectionId,
  onOpen,
  onViewAll,
  headerActions,
  diffCommentCountByPath,
  reviewThreadCountByPath,
  pendingReviewCountByPath,
  activeOpenRowKeys,
  activeOpenRowKey
}: {
  baseRef: string | null
  entries: GitBranchChangeEntry[]
  totalEntryCount: number
  collapsed: boolean
  onToggle: () => void
  sourceControlViewMode: SourceControlViewMode
  visibleTreeRows: readonly AllChangesTreeNode[]
  fileListScrollElement: HTMLDivElement | null
  collapsedTreeDirs: Set<string>
  toggleTreeDir: (key: string) => void
  currentWorktreeId: string
  worktreePath: string
  revealInExplorer: (worktreeId: string, absolutePath: string) => void
  activeConnectionId: string | null
  onOpen: (entry: GitBranchChangeEntry, event?: SourceControlRowOpenEvent) => void
  onViewAll: () => void
  headerActions?: React.ReactNode
  diffCommentCountByPath: Map<string, number>
  reviewThreadCountByPath: Map<string, number>
  pendingReviewCountByPath: Map<string, number>
  activeOpenRowKeys: ReadonlySet<string>
  activeOpenRowKey: string | null
}): React.JSX.Element {
  const fileCount = entries.length
  const ref = baseRef?.trim()
  // Why silent under a filter: a narrowed count is not the number of files changed vs the base.
  const countTitle =
    ref && fileCount === totalEntryCount
      ? fileCount === 1
        ? translate(
            'auto.components.right.sidebar.SourceControl.branchFilesChangedVsBaseOne',
            '1 file changed vs {{ref}}',
            { ref: formatSourceControlRefLabel(ref) }
          )
        : translate(
            'auto.components.right.sidebar.SourceControl.branchFilesChangedVsBaseOther',
            '{{count}} files changed vs {{ref}}',
            { count: fileCount, ref: formatSourceControlRefLabel(ref) }
          )
      : undefined

  const renderEntry = (
    entry: GitBranchChangeEntry,
    key: string,
    depth?: number
  ): React.JSX.Element => (
    <BranchEntryRow
      key={key}
      entry={entry}
      currentWorktreeId={currentWorktreeId}
      worktreePath={worktreePath}
      depth={depth}
      onRevealInExplorer={revealInExplorer}
      connectionId={activeConnectionId}
      onOpen={(event) => onOpen(entry, event)}
      commentCount={diffCommentCountByPath.get(entry.path) ?? 0}
      reviewThreadCount={reviewThreadCountByPath.get(entry.path) ?? 0}
      pendingReviewCount={pendingReviewCountByPath.get(entry.path) ?? 0}
      isOpenFile={activeOpenRowKeys.has(key)}
      showPathHint={depth === undefined}
    />
  )

  return (
    <div>
      <SectionHeader
        label={translate('allChanges.title', 'Changes')}
        count={fileCount}
        countTitle={countTitle}
        isCollapsed={collapsed}
        onToggle={onToggle}
        actions={
          <>
            {headerActions}
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="px-1.5 text-muted-foreground hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation()
                onViewAll()
              }}
            >
              {translate('auto.components.right.sidebar.SourceControl.48db37cca9', 'View all')}
            </Button>
          </>
        }
      />
      {!collapsed &&
        (sourceControlViewMode === 'tree' ? (
          <VirtualizedList
            rows={visibleTreeRows}
            scrollElement={fileListScrollElement}
            getRowKey={(node) => node.key}
            scrollToRowKey={activeOpenRowKey}
            renderRow={(node) =>
              node.type === 'directory' ? (
                <SourceControlBranchTreeDirectoryRow
                  key={node.key}
                  node={node}
                  isCollapsed={collapsedTreeDirs.has(node.key)}
                  onToggle={() => toggleTreeDir(node.key)}
                />
              ) : (
                renderEntry(node.entry, node.key, node.depth)
              )
            }
          />
        ) : (
          <VirtualizedList
            rows={entries}
            scrollElement={fileListScrollElement}
            getRowKey={(entry) => `${ALL_CHANGES_AREA}::${entry.path}`}
            scrollToRowKey={activeOpenRowKey}
            renderRow={(entry) => renderEntry(entry, `${ALL_CHANGES_AREA}::${entry.path}`)}
          />
        ))}
    </div>
  )
}
