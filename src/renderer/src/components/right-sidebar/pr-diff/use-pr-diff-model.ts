import { useCallback, useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import { useSourceControlWorktreeContext } from '../source-control/listing/use-worktree-context'
import { useSourceControlBaseRefs } from '../source-control/sync/use-base-refs'
import { useSourceControlBranchCompare } from '../source-control/sync/use-branch-compare'
import { useSourceControlBranchLineTotalGate } from '../source-control/sync/use-branch-line-total-gate'
import { useAllChangesProjection } from '../source-control/listing/use-all-changes-projection'
import { useSourceControlRowOpening } from '../source-control/listing/use-row-opening'
import { usePublishedSourceControlReviewOrder } from '../source-control/listing/use-published-review-order'
import { normalizeSourceControlViewMode } from '../source-control/commit/commit-drafts'
import { getNextSourceControlViewMode } from '../source-control/panel/header-toolbar'
import { buildChangedPathGroups } from './changed-path-grouping'
import type { FlatEntry } from '../source-control/listing/use-selection'
import type { SourceControlTreeNode } from '../source-control-tree'
import type { GitBranchChangeEntry } from '../../../../../shared/git-diff-compare-types'
import type { FileFindMode } from '../file-find/file-find-mode'
import { usePrDiffContentSearch } from './use-pr-diff-content-search'
import { setFileViewed, useViewedFiles } from './viewed-files-store'
import {
  buildChangedFileIdentity,
  didFileChangeSinceViewed,
  isFileViewed
} from '../../../../../shared/diff-review-identity'
import type { BranchEntryRowReview } from '../source-control/listing/branch-entry-row'

// Why module scope: a fresh [] each render would churn every memo keyed on it.
const NO_SELECTION_ENTRIES: FlatEntry[] = []
const NO_BRANCH_TREE_ROWS: SourceControlTreeNode<GitBranchChangeEntry, 'branch'>[] = []

/** Everything the PR diff viewer needs: the base-vs-now file list, and how to open a row. */
export function usePrDiffModel() {
  const context = useSourceControlWorktreeContext()
  const {
    activeRepo,
    activeRepoTarget,
    activeWorktree,
    activeWorktreeId,
    branchEntries,
    branchName,
    branchSummary,
    entries,
    hostedReviewEntryData,
    isBranchVisible,
    isFolder,
    remoteStatus,
    settings,
    worktreePath
  } = context

  const updateSettings = useAppStore((s) => s.updateSettings)
  const expanded = useAppStore((s) => s.rightSidebarFindExpanded)
  const setExpanded = useAppStore((s) => s.setRightSidebarFindExpanded)
  const findFocusRequestId = useAppStore((s) => s.rightSidebarFindFocusRequestId)
  const isMac = useMemo(() => navigator.userAgent.includes('Mac'), [])
  const [query, setQuery] = useState('')
  const [findMode, setFindMode] = useState<FileFindMode>('names')
  const [collapsedTreeDirs, setCollapsedTreeDirs] = useState<Set<string>>(new Set())
  const [fileListScrollElement, setFileListScrollElement] = useState<HTMLDivElement | null>(null)

  // Why: reset during render instead of key-remounting on switch (which caused a Windows IPC storm).
  const [viewStateWorktreeId, setViewStateWorktreeId] = useState(activeWorktreeId)
  if (viewStateWorktreeId !== activeWorktreeId) {
    setViewStateWorktreeId(activeWorktreeId)
    setQuery('')
    setFindMode('names')
    setCollapsedTreeDirs(new Set())
  }

  // Why read-only: this tab renders no PR metadata, so it must not start hosted-review polling —
  // but a cache warmed by Source Control keeps both tabs comparing against the same base.
  const hostedReview = hostedReviewEntryData ?? null

  const { compareBaseRef } = useSourceControlBaseRefs({
    activeRepoConnectionId: context.activeRepoConnectionId,
    activeRepoExecutionHostId: context.activeRepoExecutionHostId,
    activeRepoId: context.activeRepoId,
    activeRepoWorktreeBaseRef: activeRepo?.worktreeBaseRef,
    activeWorktreeBaseRef: activeWorktree?.baseRef,
    hostedReview,
    isBranchVisible,
    isFolder,
    remoteStatus,
    settings
  })

  const { refreshBranchCompare } = useSourceControlBranchCompare({
    activeRepoTarget,
    activeWorktreeId,
    worktreePath,
    compareBaseRef,
    isFolder,
    branchName,
    isBranchVisible,
    activeGitStatusHead: context.activeGitStatusHead ?? null,
    remoteStatus
  })

  useSourceControlBranchLineTotalGate({
    activeWorktreeId,
    branchSummary,
    isBranchVisible,
    isFolder
  })

  const sourceControlViewMode = normalizeSourceControlViewMode(settings?.sourceControlViewMode)
  // Why the shared setting: list-vs-tree is one preference across every changed-files surface.
  const toggleViewMode = useCallback(() => {
    if (!settings) {
      return
    }
    updateSettings({ sourceControlViewMode: getNextSourceControlViewMode(sourceControlViewMode) })
  }, [settings, sourceControlViewMode, updateSettings])

  const { filter, filteredGrouped, filteredBranchEntries } = useMemo(
    () => buildChangedPathGroups(entries, branchEntries, query),
    [branchEntries, entries, query]
  )

  const allChanges = useAllChangesProjection({
    activeWorktreeId,
    sourceControlGrouping: 'all',
    visibleSelectionEntries: NO_SELECTION_ENTRIES,
    entries,
    branchEntries,
    filteredGrouped,
    filteredBranchEntries,
    sourceControlViewMode,
    collapsedTreeDirs,
    forceEnabled: true
  })

  const contentSearch = usePrDiffContentSearch({
    activeWorktreeId,
    entries,
    branchEntries,
    findMode,
    findExpanded: expanded
  })

  const { resolveSplitTargetGroupId, activeOpenRowKeys, activeOpenRowKey, openAllChangesEntry } =
    useSourceControlRowOpening({
      isMac,
      activeWorktreeId,
      worktreePath,
      visibleSelectionEntries: NO_SELECTION_ENTRIES,
      branchSummary,
      sourceControlGrouping: 'all',
      statusEntries: entries,
      allChanges
    })

  usePublishedSourceControlReviewOrder({
    activeWorktreeId,
    visibleSelectionEntries: NO_SELECTION_ENTRIES,
    visibleBranchTreeRows: NO_BRANCH_TREE_ROWS,
    filteredBranchEntries,
    allChangesReviewOrder: allChanges.allChangesReviewOrder
  })

  const viewedFiles = useViewedFiles(activeWorktreeId)
  // Why recomputed rather than stored: a file is ticked only while its identity still matches, so
  // a change unticks it on the next read without any write of its own.
  const { reviewByPath, viewedCount } = useMemo(() => {
    const byPath = new Map<string, BranchEntryRowReview>()
    let viewed = 0
    for (const entry of allChanges.allChangeEntries) {
      const identity = buildChangedFileIdentity(entry)
      const fileState = viewedFiles.files[entry.path]
      const isViewed = isFileViewed(fileState, identity)
      if (isViewed) {
        viewed += 1
      }
      byPath.set(entry.path, {
        isViewed,
        changedSinceViewed: didFileChangeSinceViewed(fileState, identity),
        onToggleViewed: () => {
          if (activeWorktreeId) {
            setFileViewed(activeWorktreeId, entry.path, identity, !isViewed)
          }
        }
      })
    }
    return { reviewByPath: byPath, viewedCount: viewed }
  }, [activeWorktreeId, allChanges.allChangeEntries, viewedFiles])

  return {
    activeConnectionId: context.activeConnectionId,
    activeOpenRowKey,
    activeOpenRowKeys,
    activeWorktreeId,
    allChanges,
    branchSummary,
    collapsedTreeDirs,
    compareBaseRef,
    fileListScrollElement,
    filter,
    contentSearch,
    find: {
      expanded,
      setExpanded,
      focusRequestId: findFocusRequestId,
      query,
      setQuery,
      mode: findMode,
      setMode: setFindMode
    },
    isFolder,
    openAllChangesEntry,
    refreshBranchCompare,
    reviewByPath,
    viewedCount,
    resolveSplitTargetGroupId,
    setCollapsedTreeDirs,
    setFileListScrollElement,
    sourceControlViewMode,
    toggleViewMode,
    viewModeToggleDisabled: !settings,
    worktreePath
  }
}

export type PrDiffModel = ReturnType<typeof usePrDiffModel>
