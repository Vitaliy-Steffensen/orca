// Fork: the sections of the source-control panel and of the PR panel, in their default order. The
// renderer lays each panel out from its list, and the View menu lists the same ids as checkboxes.
export const SOURCE_CONTROL_SECTIONS = [
  // The reviewers and your verdict on the pull request.
  { id: 'pending-review', labelKey: 'sourceControlSections.review', label: 'Review' },
  // Your review comments not yet submitted.
  {
    id: 'pending-comments',
    labelKey: 'sourceControlSections.pendingComments',
    label: 'Pending review'
  },
  { id: 'agent-notes', labelKey: 'sourceControlSections.agentNotes', label: 'Agent notes' },
  { id: 'agent-turns', labelKey: 'sourceControlSections.agentTurns', label: 'Agent turns' },
  { id: 'changes', labelKey: 'sourceControlSections.changes', label: 'Changes' },
  { id: 'staged', labelKey: 'sourceControlSections.staged', label: 'Staged Changes' },
  { id: 'unstaged', labelKey: 'sourceControlSections.unstaged', label: 'Unstaged Changes' },
  { id: 'commits', labelKey: 'sourceControlSections.commits', label: 'Commits' }
] as const

/** Under the PR panel's fixed review header (number, title, merge actions). */
export const PR_PANEL_SECTIONS = [
  // Failing checks, merge conflicts and the AI fix for them.
  { id: 'pr-attention', labelKey: 'prPanelSections.attention', label: 'Needs attention' },
  { id: 'pr-checks', labelKey: 'prPanelSections.checks', label: 'Checks' },
  // Your review comments not yet submitted.
  { id: 'pr-pending-review', labelKey: 'prPanelSections.pendingReview', label: 'Pending review' },
  { id: 'pr-comments', labelKey: 'prPanelSections.comments', label: 'Comments' },
  { id: 'pr-resolved', labelKey: 'prPanelSections.resolved', label: 'Resolved' }
] as const

export type PanelSection = { id: string; labelKey: string; label: string }

export type SourceControlSectionId = (typeof SOURCE_CONTROL_SECTIONS)[number]['id']
export type PrPanelSectionId = (typeof PR_PANEL_SECTIONS)[number]['id']

/** Commits stays docked under the file list, so it can be hidden but not moved. */
export type MovableSourceControlSectionId = Exclude<SourceControlSectionId, 'commits'>

const MOVABLE_SOURCE_CONTROL_SECTION_IDS: readonly MovableSourceControlSectionId[] =
  SOURCE_CONTROL_SECTIONS.map((section) => section.id).filter(
    (id): id is MovableSourceControlSectionId => id !== 'commits'
  )
const PR_PANEL_SECTION_IDS: readonly PrPanelSectionId[] = PR_PANEL_SECTIONS.map(
  (section) => section.id
)

/** The saved order with unknown ids dropped, and sections it does not name appended. */
function orderSections<Id extends string>(
  ids: readonly Id[],
  saved: readonly string[] | undefined
): Id[] {
  const order: Id[] = []
  for (const id of [...(saved ?? []), ...ids]) {
    if ((ids as readonly string[]).includes(id) && !order.includes(id as Id)) {
      order.push(id as Id)
    }
  }
  return order
}

export function orderSourceControlSections(
  saved: readonly string[] | undefined
): MovableSourceControlSectionId[] {
  return orderSections(MOVABLE_SOURCE_CONTROL_SECTION_IDS, saved)
}

export function orderPrPanelSections(saved: readonly string[] | undefined): PrPanelSectionId[] {
  return orderSections(PR_PANEL_SECTION_IDS, saved)
}

/** `id` placed just before `beforeId`, or last when `beforeId` is null. */
export function moveSourceControlSection<Id extends string>(
  order: readonly Id[],
  id: Id,
  beforeId: Id | null
): Id[] {
  if (id === beforeId) {
    return [...order]
  }
  const rest = order.filter((candidate) => candidate !== id)
  const index = beforeId === null ? -1 : rest.indexOf(beforeId)
  return index === -1 ? [...rest, id] : [...rest.slice(0, index), id, ...rest.slice(index)]
}

export function toggleSourceControlSectionHidden(
  hidden: readonly string[] | undefined,
  id: string
): string[] {
  const current = hidden ?? []
  return current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id]
}
