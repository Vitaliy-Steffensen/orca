import type { WorkspaceStatus, WorkspaceStatusDefinition } from './worktree/types'

const WORKSPACE_STATUS_SECTION_GROUP_PREFIX = 'workspace-status-section:'
export const MAX_WORKSPACE_STATUS_SECTION_LENGTH = 32

/** Normalize a section name. Returns undefined for anything that is not a usable name. */
export function sanitizeWorkspaceStatusSection(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim().replace(/\s+/g, ' ')
  return trimmed ? trimmed.slice(0, MAX_WORKSPACE_STATUS_SECTION_LENGTH) : undefined
}

export function getWorkspaceStatusSectionGroupKey(section: string): string {
  return `${WORKSPACE_STATUS_SECTION_GROUP_PREFIX}${encodeURIComponent(section)}`
}

export function getWorkspaceStatusSectionFromGroupKey(groupKey: string): string | null {
  if (!groupKey.startsWith(WORKSPACE_STATUS_SECTION_GROUP_PREFIX)) {
    return null
  }
  try {
    return decodeURIComponent(groupKey.slice(WORKSPACE_STATUS_SECTION_GROUP_PREFIX.length)) || null
  } catch {
    return null
  }
}

export function getWorkspaceStatusSection(
  status: WorkspaceStatus,
  statuses: readonly WorkspaceStatusDefinition[]
): string | null {
  return statuses.find((entry) => entry.id === status)?.section ?? null
}

/** True once any lane opts in; until then the sidebar and board stay flat. */
export function hasWorkspaceStatusSections(
  statuses: readonly WorkspaceStatusDefinition[]
): boolean {
  return statuses.some((status) => status.section !== undefined)
}

/**
 * Section names in render order — first appearance in the lane order wins.
 *
 * Why derived rather than stored: the lane list is already the user's ordering,
 * so a second ordered list could disagree with it and leave a section with no
 * lanes (or a lane in a section that no longer exists).
 */
export function getWorkspaceStatusSectionOrder(
  statuses: readonly WorkspaceStatusDefinition[]
): string[] {
  const sections: string[] = []
  for (const status of statuses) {
    if (status.section !== undefined && !sections.includes(status.section)) {
      sections.push(status.section)
    }
  }
  return sections
}
