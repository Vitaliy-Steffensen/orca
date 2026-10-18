import { getWorkspaceStatusSectionGroupKey } from '../../../../../../shared/workspace-status-sections'
import {
  getWorkspaceStatusFromGroupKey,
  getWorkspaceStatusSectionHeaderVisual
} from '../../workspace-status'
import { appendOrderedGroups } from './group-sections'
import type { SectionAppendContext } from './group-sections'
import type { OrderedGroupEntry } from './project-grouping'

function countGroupEntry(entry: OrderedGroupEntry): number {
  return entry[1].items.length + (entry[1].folderWorkspaces?.length ?? 0)
}

/**
 * Emit workspace-status lanes under their section headers.
 *
 * Sectionless lanes stay where the user put them, at top level and without a
 * header, so an install that has never named a section renders exactly the flat
 * sequence it rendered before.
 */
export function appendStatusSectionGroups(
  ctx: SectionAppendContext,
  orderedGroups: OrderedGroupEntry[]
): void {
  const { result, collapsedGroups, workspaceStatuses } = ctx
  const sectionByStatusId = new Map(
    workspaceStatuses.map((status) => [status.id, status.section ?? null])
  )

  const entriesBySection = new Map<string | null, OrderedGroupEntry[]>()
  // Insertion order is first-appearance order, so a section renders where its
  // first lane sits and a sectionless run keeps its own top-level position.
  const emissionOrder: (string | null)[] = []
  for (const entry of orderedGroups) {
    const statusId = getWorkspaceStatusFromGroupKey(entry[0], workspaceStatuses)
    const section = (statusId === null ? null : sectionByStatusId.get(statusId)) ?? null
    if (!entriesBySection.has(section)) {
      entriesBySection.set(section, [])
      emissionOrder.push(section)
    }
    entriesBySection.get(section)!.push(entry)
  }
  for (const section of emissionOrder) {
    const entries = entriesBySection.get(section) ?? []
    if (section === null) {
      appendOrderedGroups(ctx, entries)
      continue
    }
    const key = getWorkspaceStatusSectionGroupKey(section)
    const visual = getWorkspaceStatusSectionHeaderVisual(section, workspaceStatuses)
    result.push({
      type: 'header',
      key,
      statusSection: section,
      label: section,
      count: entries.reduce((total, entry) => total + countGroupEntry(entry), 0),
      tone: visual.tone,
      icon: visual.icon
    })
    if (!collapsedGroups.has(key)) {
      appendOrderedGroups(ctx, entries, 0, key)
    }
  }
}
