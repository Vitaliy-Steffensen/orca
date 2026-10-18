import React from 'react'
import { cn } from '@/lib/utils'
import { FileCommentBadges } from '@/components/diff-comments/FileCommentBadges'
import type { FileCommentCounts } from '@/components/diff-comments/file-comment-counts'
import { REVEAL_FLASH_CLASS } from '@/lib/reveal-flash-class'
import { useSourceControlRowRevealFlash } from '@/lib/source-control-row-reveal'
import { getFileTypeIcon } from '@/lib/file-type-icons'
import { basename, dirname, joinPath } from '@/lib/path'
import { WORKSPACE_FILE_PATH_MIME } from '@/lib/workspace-file-drag'
import { writeWorkspaceFileDragSourceForWorkspace } from '@/lib/workspace-file-drag-source'
import type { GitBranchChangeEntry } from '../../../../../../shared/git-diff-compare-types'
import { DiffLineCounts } from './diff-line-counts'
import { SourceControlEntryContextMenu } from './entry-context-menu'
import { toPermanentSourceControlRowOpenEvent, type SourceControlRowOpenEvent } from './split-open'
import { SOURCE_CONTROL_TREE_FILE_PADDING_PX, SOURCE_CONTROL_TREE_INDENT_PX } from './row-layout'
import { STATUS_COLORS, STATUS_LABELS } from '../../status-display'

export function BranchEntryRow({
  entry,
  rowKey,
  currentWorktreeId,
  worktreePath,
  depth = 0,
  onRevealInExplorer,
  connectionId,
  onOpen,
  commentCounts,
  isOpenFile = false,
  showPathHint = true
}: {
  entry: GitBranchChangeEntry
  rowKey: string
  currentWorktreeId: string
  worktreePath: string
  depth?: number
  onRevealInExplorer: (worktreeId: string, absolutePath: string) => void
  connectionId?: string | null
  onOpen: (event?: SourceControlRowOpenEvent) => void
  commentCounts: FileCommentCounts | undefined
  isOpenFile?: boolean
  showPathHint?: boolean
}): React.JSX.Element {
  const revealFlashing = useSourceControlRowRevealFlash(rowKey)
  const FileIcon = getFileTypeIcon(entry.path)
  const fileName = basename(entry.path)
  const parentDir = dirname(entry.path)
  const dirPath = parentDir === '.' ? '' : parentDir

  return (
    <SourceControlEntryContextMenu
      currentWorktreeId={currentWorktreeId}
      absolutePath={joinPath(worktreePath, entry.path)}
      relativePath={entry.path}
      hasWorkingTreeFile={entry.status !== 'deleted'}
      connectionId={connectionId}
      onView={() => onOpen()}
      onRevealInExplorer={onRevealInExplorer}
    >
      <div
        // Why: mirrors the uncommitted row so the open file reads the same whether it came from the
        // working tree or the branch comparison.
        data-source-control-path={entry.path}
        data-current={isOpenFile ? 'true' : undefined}
        className={cn(
          'group flex cursor-pointer items-center gap-1 pr-3 py-1 transition-colors',
          isOpenFile ? 'bg-accent hover:bg-accent' : 'hover:bg-accent/40',
          revealFlashing && REVEAL_FLASH_CLASS
        )}
        style={{
          paddingLeft: `${depth * SOURCE_CONTROL_TREE_INDENT_PX + SOURCE_CONTROL_TREE_FILE_PADDING_PX}px`
        }}
        draggable
        onDragStart={(e) => {
          const absolutePath = joinPath(worktreePath, entry.path)
          e.dataTransfer.setData(WORKSPACE_FILE_PATH_MIME, absolutePath)
          writeWorkspaceFileDragSourceForWorkspace(e.dataTransfer, currentWorktreeId)
          e.dataTransfer.effectAllowed = 'copy'
        }}
        onClick={(e) => onOpen(e)}
        onDoubleClick={(e) => onOpen(toPermanentSourceControlRowOpenEvent(e))}
      >
        {React.createElement(FileIcon, {
          className: 'size-3.5 shrink-0',
          style: { color: STATUS_COLORS[entry.status] }
        })}
        <span className="min-w-0 flex-1 truncate text-xs">
          <span className="text-foreground">{fileName}</span>
          {showPathHint && dirPath && (
            <span className="ml-1.5 text-[11px] text-muted-foreground">{dirPath}</span>
          )}
        </span>
        <FileCommentBadges counts={commentCounts} />
        <DiffLineCounts added={entry.added} removed={entry.removed} />
        <span
          className="w-4 shrink-0 text-center text-[10px] font-bold"
          style={{ color: STATUS_COLORS[entry.status] }}
        >
          {STATUS_LABELS[entry.status]}
        </span>
      </div>
    </SourceControlEntryContextMenu>
  )
}
