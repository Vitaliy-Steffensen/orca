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

/** Rename a section on every lane; a name that already exists merges into it, an empty one dissolves it. */
export function renameWorkspaceStatusSection(
  statuses: readonly WorkspaceStatusDefinition[],
  from: string,
  to: string | undefined
): WorkspaceStatusDefinition[] {
  if (to === from) {
    return [...statuses]
  }
  const target = to === undefined ? undefined : getWorkspaceStatusSectionAppearance(to, statuses)
  const own = getWorkspaceStatusSectionAppearance(from, statuses)
  const hasTarget = to !== undefined && statuses.some((status) => status.section === to)
  return statuses.map((status) => {
    if (status.section !== from) {
      return status
    }
    if (to === undefined) {
      return laneWithoutSection(status)
    }
    const appearance = hasTarget ? target : own
    return withSectionAppearance(status, to, {
      sectionIcon: appearance?.icon,
      sectionColor: appearance?.color
    })
  })
}

/** Swap a lane with its nearest neighbour inside the same section (or among sectionless lanes). */
export function moveWorkspaceStatusWithinSection(
  statuses: readonly WorkspaceStatusDefinition[],
  statusId: string,
  direction: -1 | 1
): WorkspaceStatusDefinition[] {
  const index = statuses.findIndex((status) => status.id === statusId)
  if (index === -1) {
    return [...statuses]
  }
  const section = statuses[index]!.section
  let neighbour = index + direction
  while (
    neighbour >= 0 &&
    neighbour < statuses.length &&
    statuses[neighbour]!.section !== section
  ) {
    neighbour += direction
  }
  if (neighbour < 0 || neighbour >= statuses.length) {
    return [...statuses]
  }
  const next = [...statuses]
  next[index] = statuses[neighbour]!
  next[neighbour] = statuses[index]!
  return next
}

const UNRANKED_LANE_ATTENTION = Number.MAX_SAFE_INTEGER
/** A section the workflow does not name sits above Autonomous, which is always last. */
const CUSTOM_SECTION_ATTENTION_RANK = 3

/**
 * Ask is the question in front of you. Research is that same band under the
 * name it has today. Needs me is the action list. Autonomous needs nothing
 * from you, so it stays at the bottom even when its lanes were saved first.
 */
const SECTION_ATTENTION_RANK = new Map<string, number>([
  ['ask', 0],
  ['research', 1],
  ['needs me', 2],
  ['autonomous', 4]
])

/**
 * Within a section, smaller ranks render higher. A lane this map does not
 * name keeps its saved position after the named ones.
 *
 * Needs me is ordered by who is stuck: an open question, then stopped work,
 * then a person waiting, then your own review, then optional new work.
 */
const LANE_ATTENTION_RANK = new Map<string, number>([
  ['research', 0],
  ['potential tasks', 1],
  ['weekly recap', 2],
  ['answer questions', 0],
  ['flagged', 1],
  ['incoming comments', 2],
  ['review other', 3],
  ['skim implementation', 4],
  ['my review', 5],
  ['autonomous review', 6],
  ['needs merge', 7],
  ['candidates', 8],
  ['scoping', 0],
  ['implementing', 1],
  ['agent review', 2],
  ['waiting on ci', 3],
  ['waiting on reviewers', 4]
])

function attentionKey(value: string): string {
  return value.trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
}

function sectionAttentionRank(section: string): number {
  return SECTION_ATTENTION_RANK.get(attentionKey(section)) ?? CUSTOM_SECTION_ATTENTION_RANK
}

function laneAttentionRank(status: Pick<WorkspaceStatusDefinition, 'id' | 'label'>): number {
  return (
    LANE_ATTENTION_RANK.get(attentionKey(status.id)) ??
    LANE_ATTENTION_RANK.get(attentionKey(status.label)) ??
    UNRANKED_LANE_ATTENTION
  )
}

/**
 * Section names in sidebar order.
 *
 * Why derived rather than stored: the lane list is already the user's pipeline,
 * so a second ordered list could disagree with it and leave a section with no
 * lanes. Attention rank picks the order; first appearance breaks ties.
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
    .map((section, index) => ({ section, index }))
    .sort(
      (a, b) =>
        sectionAttentionRank(a.section) - sectionAttentionRank(b.section) || a.index - b.index
    )
    .map(({ section }) => section)
}

/**
 * Sidebar lane order. The board keeps the saved pipeline; this is only the
 * list that answers what to look at first.
 *
 * Sectionless lanes keep the slots they were saved in. Sectioned lanes are
 * rewritten into those slots, so Autonomous saved first still renders last.
 */
export function orderWorkspaceStatusesByAttention(
  statuses: readonly WorkspaceStatusDefinition[]
): readonly WorkspaceStatusDefinition[] {
  const sectionedSlots: number[] = []
  for (let index = 0; index < statuses.length; index += 1) {
    if (statuses[index]?.section !== undefined) {
      sectionedSlots.push(index)
    }
  }
  if (sectionedSlots.length < 2) {
    return statuses
  }
  const sectionRank = new Map(
    getWorkspaceStatusSectionOrder(statuses).map((section, index) => [section, index])
  )
  const ordered = sectionedSlots
    .map((slot) => ({ status: statuses[slot]!, index: slot }))
    .sort((a, b) => {
      const bySection =
        (sectionRank.get(a.status.section ?? '') ?? 0) -
        (sectionRank.get(b.status.section ?? '') ?? 0)
      if (bySection !== 0) {
        return bySection
      }
      const byLane = laneAttentionRank(a.status) - laneAttentionRank(b.status)
      return byLane !== 0 ? byLane : a.index - b.index
    })
    .map(({ status }) => status)
  if (ordered.every((status, index) => status === statuses[sectionedSlots[index]!])) {
    return statuses
  }
  const result = statuses.slice()
  sectionedSlots.forEach((slot, index) => {
    result[slot] = ordered[index]!
  })
  return result
}
