import {
  computeWorktreeSidebarHeaderDropPreview,
  type WorktreeSidebarHeaderDropPreview
} from './worktree-sidebar-header-drop-preview'
import type { Row } from './worktree-list/grouping/row-types'

export type WorkspaceStatusHeaderDragBucketKey = string

/** Every band is a peer of every other band, so they share one bucket. */
export const WORKSPACE_STATUS_SECTION_BUCKET = 'workspace-status-sections'

export type WorkspaceStatusHeaderDragRect = {
  headerKey: string
  bucketKey: WorkspaceStatusHeaderDragBucketKey
  // Index among sibling status headers in the row model, not mounted DOM.
  headerIndex: number
  top: number
  bottom: number
  sectionBottom?: number
}

export type WorkspaceStatusHeaderDropPreview = WorktreeSidebarHeaderDropPreview

/**
 * The bucket a status header reorders inside: bands among bands, lanes inside the
 * band that owns them. A lane's `parentKey` is already its band's row key, so two
 * bands can never share a lane bucket.
 */
export function getWorkspaceStatusHeaderDragBucketKey(row: {
  type: string
  statusSection?: string
  parentKey?: string
}): WorkspaceStatusHeaderDragBucketKey | null {
  if (row.type !== 'header') {
    return null
  }
  if (row.statusSection !== undefined) {
    return WORKSPACE_STATUS_SECTION_BUCKET
  }
  return row.parentKey ?? null
}

export function getSidebarOrderedWorkspaceStatusHeaderIdsByBucket(
  rows: readonly Row[]
): Map<WorkspaceStatusHeaderDragBucketKey, string[]> {
  const buckets = new Map<WorkspaceStatusHeaderDragBucketKey, string[]>()
  for (const row of rows) {
    if (row.type !== 'header') {
      continue
    }
    const bucketKey = getWorkspaceStatusHeaderDragBucketKey(row)
    if (bucketKey === null) {
      continue
    }
    const list = buckets.get(bucketKey) ?? []
    list.push(row.key)
    buckets.set(bucketKey, list)
  }
  return buckets
}

/** The sibling order a drop produces, or null when the header lands back where it started. */
export function getWorkspaceStatusHeaderOrderForSidebarDrop(args: {
  sidebarHeaderKeys: readonly string[]
  draggedHeaderKey: string
  sidebarDropIndex: number
}): string[] | null {
  const sourceIndex = args.sidebarHeaderKeys.indexOf(args.draggedHeaderKey)
  if (sourceIndex === -1) {
    return null
  }
  const siblings = args.sidebarHeaderKeys.filter((key) => key !== args.draggedHeaderKey)
  // Why: sidebar drop indices count the dragged header, the insert index does not.
  const adjusted =
    args.sidebarDropIndex > sourceIndex ? args.sidebarDropIndex - 1 : args.sidebarDropIndex
  const insertIndex = Math.max(0, Math.min(siblings.length, adjusted))
  if (insertIndex === Math.min(sourceIndex, siblings.length)) {
    return null
  }
  const ordered = siblings.slice()
  ordered.splice(insertIndex, 0, args.draggedHeaderKey)
  return ordered
}

function getVirtualRowStart(virtualRow: HTMLElement | null): number | null {
  if (!virtualRow) {
    return null
  }
  const rawStart = virtualRow.getAttribute('data-worktree-virtual-row-start')
  if (rawStart === null) {
    return null
  }
  const start = Number(rawStart)
  return Number.isFinite(start) ? start : null
}

function getOptionalNumberAttribute(element: HTMLElement, attribute: string): number | undefined {
  const rawValue = element.getAttribute(attribute)
  if (rawValue === null) {
    return undefined
  }
  const value = Number(rawValue)
  return Number.isFinite(value) ? value : undefined
}

export function measureWorkspaceStatusHeaderDragRects(
  container: HTMLElement,
  bucketKey?: WorkspaceStatusHeaderDragBucketKey
): WorkspaceStatusHeaderDragRect[] {
  const containerRect = container.getBoundingClientRect()
  const rects: WorkspaceStatusHeaderDragRect[] = []
  container
    .querySelectorAll<HTMLElement>('[data-workspace-status-header-id]')
    .forEach((element) => {
      const headerKey = element.getAttribute('data-workspace-status-header-id')
      const elementBucketKey = element.getAttribute('data-workspace-status-header-bucket')
      const rawHeaderIndex = element.getAttribute('data-workspace-status-header-index')
      const headerIndex = rawHeaderIndex === null ? Number.NaN : Number(rawHeaderIndex)
      if (!headerKey || !elementBucketKey || !Number.isFinite(headerIndex)) {
        return
      }
      if (bucketKey !== undefined && elementBucketKey !== bucketKey) {
        return
      }
      const rect = element.getBoundingClientRect()
      const virtualRow = element.closest<HTMLElement>('[data-worktree-virtual-row]')
      const virtualRowStart = getVirtualRowStart(virtualRow)
      const top =
        virtualRow && virtualRowStart !== null
          ? virtualRowStart + rect.top - virtualRow.getBoundingClientRect().top
          : rect.top - containerRect.top + container.scrollTop
      rects.push({
        headerKey,
        bucketKey: elementBucketKey,
        headerIndex,
        top,
        bottom: top + rect.height,
        sectionBottom: getOptionalNumberAttribute(
          element,
          'data-workspace-status-header-section-end'
        )
      })
    })
  rects.sort((left, right) => left.top - right.top)
  return rects
}

export function computeWorkspaceStatusHeaderDropPreview(args: {
  pointerY: number
  containerTop: number
  scrollTop: number
  rects: readonly WorkspaceStatusHeaderDragRect[]
  sidebarHeaderKeys: readonly string[]
  contentBottom?: number
}): WorkspaceStatusHeaderDropPreview | null {
  return computeWorktreeSidebarHeaderDropPreview({
    pointerY: args.pointerY,
    containerTop: args.containerTop,
    scrollTop: args.scrollTop,
    rects: args.rects,
    headerCount: args.sidebarHeaderKeys.length,
    getId: (rect) => rect.headerKey,
    contentBottom: args.contentBottom
  })
}
