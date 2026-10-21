import type { GroupHeaderRow } from '../grouping/row-types'
import type { WorktreeSidebarHeaderDrag } from '../drag/use-header-drag'

export type SectionHeaderDragBindings = {
  repoHeaderIndex: number | undefined
  repoHeaderBucketKey: string | undefined
  projectGroupHeaderIndex: number | undefined
  projectGroupHeaderBucketKey: string | undefined
  statusHeaderIndex: number | undefined
  statusHeaderBucketKey: string | undefined
  isDraggableRepoHeader: boolean
  isDraggableProjectGroupHeader: boolean
  isDraggableStatusHeader: boolean
  isDraggingThisRepo: boolean
  isDraggingThisProjectGroup: boolean
  isDraggingThisStatusHeader: boolean
}

/** Every reorder tier's answer for one header row: its slot, its bucket, and whether it can move. */
export function getSectionHeaderDragBindings(args: {
  headerDrag: WorktreeSidebarHeaderDrag
  row: GroupHeaderRow
  isRepoHeader: boolean
  projectIdForHeader: string | undefined
  projectGroupIdForHeader: string | undefined
}): SectionHeaderDragBindings {
  const { headerDrag, row, projectIdForHeader, projectGroupIdForHeader } = args
  const repoHeaderBucketKey =
    projectIdForHeader !== undefined
      ? headerDrag.repoHeaderBucketByRepoId.get(projectIdForHeader)
      : undefined
  const projectGroupHeaderBucketKey =
    projectGroupIdForHeader !== undefined
      ? headerDrag.projectGroupHeaderBucketByGroupId.get(projectGroupIdForHeader)
      : undefined
  const statusHeaderBucketKey = headerDrag.statusHeaderBucketByKey.get(row.key)
  return {
    repoHeaderIndex:
      projectIdForHeader !== undefined
        ? headerDrag.repoHeaderIndexByRepoId.get(projectIdForHeader)
        : undefined,
    repoHeaderBucketKey,
    projectGroupHeaderIndex:
      projectGroupIdForHeader !== undefined
        ? headerDrag.projectGroupHeaderIndexByGroupId.get(projectGroupIdForHeader)
        : undefined,
    projectGroupHeaderBucketKey,
    statusHeaderIndex: headerDrag.statusHeaderIndexByKey.get(row.key),
    statusHeaderBucketKey,
    isDraggableRepoHeader: Boolean(
      headerDrag.canReorderRepoHeaders &&
      args.isRepoHeader &&
      projectIdForHeader &&
      repoHeaderBucketKey &&
      (headerDrag.sidebarRepoHeaderIdsByBucket.get(repoHeaderBucketKey)?.length ?? 0) > 1
    ),
    isDraggableProjectGroupHeader: Boolean(
      headerDrag.canReorderProjectGroupHeaders &&
      projectGroupIdForHeader &&
      projectGroupHeaderBucketKey &&
      (headerDrag.sidebarProjectGroupHeaderIdsByBucket.get(projectGroupHeaderBucketKey)?.length ??
        0) > 1
    ),
    isDraggableStatusHeader: Boolean(
      headerDrag.canReorderStatusHeaders &&
      statusHeaderBucketKey &&
      (headerDrag.sidebarStatusHeaderKeysByBucket.get(statusHeaderBucketKey)?.length ?? 0) > 1
    ),
    isDraggingThisRepo:
      headerDrag.canReorderRepoHeaders &&
      headerDrag.repoDrag.state.draggingRepoId !== null &&
      headerDrag.repoDrag.state.draggingRepoId === projectIdForHeader,
    isDraggingThisProjectGroup:
      headerDrag.canReorderProjectGroupHeaders &&
      headerDrag.projectGroupDrag.state.draggingGroupId !== null &&
      headerDrag.projectGroupDrag.state.draggingGroupId === projectGroupIdForHeader,
    isDraggingThisStatusHeader:
      headerDrag.canReorderStatusHeaders &&
      headerDrag.statusDrag.state.draggingHeaderKey === row.key
  }
}
