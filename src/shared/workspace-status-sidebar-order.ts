import { sanitizeWorkspaceStatusSection } from './workspace-status-sections'
import type { WorkspaceStatusDefinition } from './worktree/types'

/**
 * The order the user dragged the sidebar into.
 *
 * `sections` overrules the attention ranking for the bands it names.
 * `manualLaneSections` is the per-band opt-out of lane attention ranking: without it a
 * dragged lane would be sorted straight back to its ranked slot on the next render.
 */
export type WorkspaceStatusSidebarOrder = {
  sections: string[]
  manualLaneSections: string[]
}

export function createDefaultWorkspaceStatusSidebarOrder(): WorkspaceStatusSidebarOrder {
  return { sections: [], manualLaneSections: [] }
}

function normalizeSectionNameList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  const result: string[] = []
  for (const entry of value) {
    const name = sanitizeWorkspaceStatusSection(entry)
    if (name !== undefined && !result.includes(name)) {
      result.push(name)
    }
  }
  return result
}

export function normalizeWorkspaceStatusSidebarOrder(value: unknown): WorkspaceStatusSidebarOrder {
  if (value === null || typeof value !== 'object') {
    return createDefaultWorkspaceStatusSidebarOrder()
  }
  const record: Record<string, unknown> = { ...value }
  return {
    sections: normalizeSectionNameList(record.sections),
    manualLaneSections: normalizeSectionNameList(record.manualLaneSections)
  }
}

/** Move `section` to `targetIndex` in the user's band order, seeding from the order rendered today. */
export function moveWorkspaceStatusSectionInOrder(
  renderedSections: readonly string[],
  saved: WorkspaceStatusSidebarOrder,
  section: string,
  targetIndex: number
): WorkspaceStatusSidebarOrder {
  const seeded = renderedSections.filter((name) => name !== section)
  const index = Math.max(0, Math.min(targetIndex, seeded.length))
  seeded.splice(index, 0, section)
  return { ...saved, sections: seeded }
}

/** Mark a band as owning its own lane order, so attention rank stops rewriting it. */
export function markWorkspaceStatusLaneSectionManual(
  saved: WorkspaceStatusSidebarOrder,
  section: string
): WorkspaceStatusSidebarOrder {
  if (saved.manualLaneSections.includes(section)) {
    return saved
  }
  return { ...saved, manualLaneSections: [...saved.manualLaneSections, section] }
}

/**
 * Rewrite one section's lanes into the order given, leaving every other lane —
 * sectionless or in another band — at the exact index it already held.
 */
export function reorderWorkspaceStatusLanesInSection(
  statuses: readonly WorkspaceStatusDefinition[],
  section: string,
  orderedLaneIds: readonly string[]
): WorkspaceStatusDefinition[] {
  const slots: number[] = []
  for (let index = 0; index < statuses.length; index += 1) {
    if (statuses[index]?.section === section) {
      slots.push(index)
    }
  }
  const lanes = slots.map((slot) => statuses[slot]!)
  const ordered = orderedLaneIds
    .map((id) => lanes.find((lane) => lane.id === id))
    .filter((lane): lane is WorkspaceStatusDefinition => lane !== undefined)
  for (const lane of lanes) {
    if (!ordered.includes(lane)) {
      ordered.push(lane)
    }
  }
  const result = statuses.slice()
  slots.forEach((slot, index) => {
    result[slot] = ordered[index]!
  })
  return result
}
