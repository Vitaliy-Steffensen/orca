import type { WorkspaceStatus, WorkspaceStatusDefinition } from './worktree/types'

export type WorkspaceStatusSectionAppearance = {
  icon?: string
  color?: string
}

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

/** First configured icon and color among the lanes that belong to `section`. */
export function getWorkspaceStatusSectionAppearance(
  section: string,
  statuses: readonly WorkspaceStatusDefinition[]
): WorkspaceStatusSectionAppearance {
  let icon: string | undefined
  let color: string | undefined
  for (const status of statuses) {
    if (status.section !== section) {
      continue
    }
    icon ??= status.sectionIcon
    color ??= status.sectionColor
    if (icon !== undefined && color !== undefined) {
      break
    }
  }
  return {
    ...(icon === undefined ? {} : { icon }),
    ...(color === undefined ? {} : { color })
  }
}

function laneWithoutSection(status: WorkspaceStatusDefinition): WorkspaceStatusDefinition {
  const {
    section: _section,
    sectionIcon: _sectionIcon,
    sectionColor: _sectionColor,
    ...lane
  } = status
  return lane
}

function withSectionAppearance(
  status: WorkspaceStatusDefinition,
  section: string,
  appearance: { sectionIcon?: string; sectionColor?: string }
): WorkspaceStatusDefinition {
  const lane = laneWithoutSection(status)
  return {
    ...lane,
    section,
    ...(appearance.sectionIcon === undefined ? {} : { sectionIcon: appearance.sectionIcon }),
    ...(appearance.sectionColor === undefined ? {} : { sectionColor: appearance.sectionColor })
  }
}

/**
 * Move one lane into a section, or out of every section.
 *
 * A lane that joins an existing section picks up that section's icon and color.
 * Renaming the only lane in a section keeps the look. Splitting one lane off
 * into a new name starts that name without a custom look.
 */
export function assignWorkspaceStatusSection(
  statuses: readonly WorkspaceStatusDefinition[],
  statusId: string,
  section: string | undefined
): WorkspaceStatusDefinition[] {
  const current = statuses.find((status) => status.id === statusId)
  if (!current) {
    return [...statuses]
  }
  if (section === undefined) {
    return statuses.map((status) => (status.id === statusId ? laneWithoutSection(status) : status))
  }
  const peer = statuses.find((status) => status.id !== statusId && status.section === section)
  const othersRemain =
    current.section !== undefined &&
    statuses.some((status) => status.id !== statusId && status.section === current.section)
  const appearance = peer
    ? { sectionIcon: peer.sectionIcon, sectionColor: peer.sectionColor }
    : othersRemain
      ? {}
      : { sectionIcon: current.sectionIcon, sectionColor: current.sectionColor }
  return statuses.map((status) =>
    status.id === statusId ? withSectionAppearance(status, section, appearance) : status
  )
}

/** Write an icon and/or color onto every lane that already belongs to `section`. */
export function updateWorkspaceStatusSectionAppearance(
  statuses: readonly WorkspaceStatusDefinition[],
  section: string,
  appearance: WorkspaceStatusSectionAppearance
): WorkspaceStatusDefinition[] {
  return statuses.map((status) => {
    if (status.section !== section) {
      return status
    }
    const sectionIcon = appearance.icon ?? status.sectionIcon
    const sectionColor = appearance.color ?? status.sectionColor
    return withSectionAppearance(status, section, { sectionIcon, sectionColor })
  })
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
