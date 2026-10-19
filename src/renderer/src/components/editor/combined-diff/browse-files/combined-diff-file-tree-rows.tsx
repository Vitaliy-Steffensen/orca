import React from 'react'
import { VirtualizedList } from '@/components/virtualized-list'
import type { FileCommentCountsByPath } from '@/components/diff-comments/file-comment-counts'
import type {
  CombinedDiffFileTreeEntry,
  CombinedDiffFileTreeMode
} from '../resolve-changes/combined-diff-section-identity'
import {
  CombinedDiffFileTreeRow,
  COMBINED_DIFF_TREE_ROW_HEIGHT_PX
} from './combined-diff-file-tree-row'
import type { CombinedDiffTreeNode } from './combined-diff-file-tree-model'

/**
 * One flattened tree section, windowed inside the file tree's scroller. A 900-file review flattens
 * to over a thousand rows; below the virtualize threshold the rows stay in natural flow so small
 * diffs keep byte-identical markup.
 */
export function CombinedDiffFileTreeRows({
  rows,
  mode,
  worktreePath,
  sourceWorkspaceId,
  activeSectionKey,
  sectionIndexByKey,
  collapsedDirectoryKeys,
  visibleFileCounts,
  commentCountsByPath,
  scrollElement,
  flashRowKey,
  scrollToRowKey,
  onToggleDirectory,
  onNavigate
}: {
  rows: readonly CombinedDiffTreeNode[]
  mode: CombinedDiffFileTreeMode
  worktreePath: string
  sourceWorkspaceId?: string
  activeSectionKey: string | null
  sectionIndexByKey: ReadonlyMap<string, number>
  collapsedDirectoryKeys: ReadonlySet<string>
  visibleFileCounts: ReadonlyMap<string, number> | undefined
  commentCountsByPath: FileCommentCountsByPath | undefined
  scrollElement: HTMLDivElement | null
  flashRowKey: string | null
  scrollToRowKey: string | null
  onToggleDirectory: (key: string) => void
  onNavigate: (entry: CombinedDiffFileTreeEntry) => void
}): React.JSX.Element {
  return (
    <VirtualizedList
      rows={rows}
      scrollElement={scrollElement}
      estimateRowHeightPx={COMBINED_DIFF_TREE_ROW_HEIGHT_PX}
      getRowKey={(node) => node.key}
      scrollToRowKey={scrollToRowKey}
      renderRow={(node) => (
        <CombinedDiffFileTreeRow
          key={node.key}
          node={node}
          mode={mode}
          worktreePath={worktreePath}
          sourceWorkspaceId={sourceWorkspaceId}
          activeSectionKey={activeSectionKey}
          sectionIndexByKey={sectionIndexByKey}
          isCollapsed={collapsedDirectoryKeys.has(node.key)}
          isFlashing={node.key === flashRowKey}
          visibleFileCount={visibleFileCounts?.get(node.key)}
          // Why resolved here, not in the row: the row is memo'd, so passing the whole map would
          // re-render every row whenever any comment anywhere changes.
          commentCounts={
            node.type === 'file' ? commentCountsByPath?.get(node.entry.path) : undefined
          }
          onToggleDirectory={onToggleDirectory}
          onNavigate={onNavigate}
        />
      )}
    />
  )
}
