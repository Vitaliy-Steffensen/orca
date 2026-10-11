// Fork: the source-control panel's sections, in their default order. The renderer lays them out
// from this, and the View menu lists the same ids as visibility checkboxes.
export const SOURCE_CONTROL_SECTIONS = [
  // The reviewers and your pending review of the pull request.
  { id: 'pending-review', labelKey: 'sourceControlSections.review', label: 'Review' },
  { id: 'agent-notes', labelKey: 'sourceControlSections.agentNotes', label: 'Agent notes' },
  { id: 'agent-turns', labelKey: 'sourceControlSections.agentTurns', label: 'Agent turns' },
  { id: 'changes', labelKey: 'sourceControlSections.changes', label: 'Changes' },
  { id: 'commits', labelKey: 'sourceControlSections.commits', label: 'Commits' }
] as const

export type SourceControlSectionId = (typeof SOURCE_CONTROL_SECTIONS)[number]['id']

/** Commits stays docked under the file list, so it can be hidden but not moved. */
export type MovableSourceControlSectionId = Exclude<SourceControlSectionId, 'commits'>

const MOVABLE_SECTION_IDS: readonly MovableSourceControlSectionId[] = SOURCE_CONTROL_SECTIONS.map(
  (section) => section.id
).filter((id): id is MovableSourceControlSectionId => id !== 'commits')

function isMovableSectionId(id: string): id is MovableSourceControlSectionId {
  return (MOVABLE_SECTION_IDS as readonly string[]).includes(id)
}

/** The saved order with unknown ids dropped, and sections it does not name appended. */
export function orderSourceControlSections(
  saved: readonly string[] | undefined
): MovableSourceControlSectionId[] {
  const order: MovableSourceControlSectionId[] = []
  for (const id of [...(saved ?? []), ...MOVABLE_SECTION_IDS]) {
    if (isMovableSectionId(id) && !order.includes(id)) {
      order.push(id)
    }
  }
  return order
}

/** `id` placed just before `beforeId`, or last when `beforeId` is null. */
export function moveSourceControlSection(
  order: readonly MovableSourceControlSectionId[],
  id: MovableSourceControlSectionId,
  beforeId: MovableSourceControlSectionId | null
): MovableSourceControlSectionId[] {
  if (id === beforeId) {
    return [...order]
  }
  const rest = order.filter((candidate) => candidate !== id)
  const index = beforeId === null ? -1 : rest.indexOf(beforeId)
  return index === -1 ? [...rest, id] : [...rest.slice(0, index), id, ...rest.slice(index)]
}

export function toggleSourceControlSectionHidden(
  hidden: readonly string[] | undefined,
  id: SourceControlSectionId
): string[] {
  const current = hidden ?? []
  return current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id]
}
