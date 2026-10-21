import { CircleAlert, CirclePlay, Layers } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { buildRows } from './build-rows'
import { getGroupKeysForWorktree } from './worktree-group-keys'
import { getWorkspaceStatusSectionGroupKey } from '../../../../../../shared/workspace-status-sections'
import { cloneDefaultWorkspaceStatuses } from '../../../../../../shared/workspace-statuses'
import { repo, repoMap, worktree } from '../../worktree-list-groups-test-fixtures'
import type { WorkspaceStatusDefinition } from '../../../../../../shared/worktree/types'
import type { WorkspaceStatusSidebarOrder } from '../../../../../../shared/workspace-status-sidebar-order'

const SECTIONED_STATUSES: WorkspaceStatusDefinition[] = [
  { id: 'scoping', label: 'scoping', section: 'Research' },
  { id: 'my-review', label: 'my review', section: 'Needs me' },
  { id: 'flagged', label: 'flagged', section: 'Needs me' },
  { id: 'implementing', label: 'implementing', section: 'Autonomous' }
]

const NEEDS_ME_KEY = getWorkspaceStatusSectionGroupKey('Needs me')
const RESEARCH_KEY = getWorkspaceStatusSectionGroupKey('Research')

function workspace(id: string, workspaceStatus: string) {
  return { ...worktree, id, repoId: repo.id, displayName: id, workspaceStatus }
}

function rowsFor(args: {
  statuses?: WorkspaceStatusDefinition[]
  collapsed?: string[]
  worktrees?: ReturnType<typeof workspace>[]
  sidebarOrder?: WorkspaceStatusSidebarOrder
}) {
  return buildRows(
    'workspace-status',
    args.worktrees ?? [
      workspace('wt-scope', 'scoping'),
      workspace('wt-review', 'my-review'),
      workspace('wt-flag', 'flagged'),
      workspace('wt-impl', 'implementing')
    ],
    repoMap,
    null,
    new Set(args.collapsed ?? []),
    undefined,
    args.statuses ?? SECTIONED_STATUSES,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    args.sidebarOrder
  )
}

function summarize(rows: ReturnType<typeof buildRows>) {
  return rows.map((row) =>
    row.type === 'header'
      ? `header ${row.key}${row.parentKey ? ` <${row.parentKey}` : ''}`
      : row.type === 'item'
        ? `item ${row.worktree.id}`
        : row.type
  )
}

describe('workspace-status sections', () => {
  it('nests lanes under their section header in attention order', () => {
    expect(summarize(rowsFor({}))).toEqual([
      `header ${RESEARCH_KEY}`,
      `header workspace-status:scoping <${RESEARCH_KEY}`,
      'item wt-scope',
      `header ${NEEDS_ME_KEY}`,
      `header workspace-status:flagged <${NEEDS_ME_KEY}`,
      'item wt-flag',
      `header workspace-status:my-review <${NEEDS_ME_KEY}`,
      'item wt-review',
      `header ${getWorkspaceStatusSectionGroupKey('Autonomous')}`,
      `header workspace-status:implementing <${getWorkspaceStatusSectionGroupKey('Autonomous')}`,
      'item wt-impl'
    ])
  })

  it('keeps Ask above Needs me and Autonomous at the bottom when the saved order is reversed', () => {
    const statuses: WorkspaceStatusDefinition[] = [
      { id: 'implementing', label: 'Implementing', section: 'Autonomous' },
      { id: 'skim-implementation', label: 'Skim implementation', section: 'Needs me' },
      { id: 'review-other', label: 'Review other', section: 'Needs me' },
      { id: 'research', label: 'Research', section: 'Ask' }
    ]
    const askKey = getWorkspaceStatusSectionGroupKey('Ask')
    expect(
      summarize(
        rowsFor({
          statuses,
          worktrees: [
            workspace('wt-impl', 'implementing'),
            workspace('wt-skim', 'skim-implementation'),
            workspace('wt-other', 'review-other'),
            workspace('wt-ask', 'research')
          ]
        })
      )
    ).toEqual([
      `header ${askKey}`,
      `header workspace-status:research <${askKey}`,
      'item wt-ask',
      `header ${NEEDS_ME_KEY}`,
      `header workspace-status:review-other <${NEEDS_ME_KEY}`,
      'item wt-other',
      `header workspace-status:skim-implementation <${NEEDS_ME_KEY}`,
      'item wt-skim',
      `header ${getWorkspaceStatusSectionGroupKey('Autonomous')}`,
      `header workspace-status:implementing <${getWorkspaceStatusSectionGroupKey('Autonomous')}`,
      'item wt-impl'
    ])
  })

  it('uses a configured icon and color on the outer section header', () => {
    const rows = rowsFor({
      statuses: SECTIONED_STATUSES.map((status) =>
        status.section === 'Needs me'
          ? { ...status, sectionIcon: 'circle-alert', sectionColor: 'rose' }
          : status.section === 'Autonomous'
            ? { ...status, sectionIcon: 'circle-play', sectionColor: 'sky' }
            : status
      )
    })

    expect(
      rows.find((row) => row.type === 'header' && row.statusSection === 'Needs me')
    ).toMatchObject({
      tone: 'text-rose-600 dark:text-rose-300',
      icon: CircleAlert
    })
    expect(
      rows.find((row) => row.type === 'header' && row.statusSection === 'Autonomous')
    ).toMatchObject({
      tone: 'text-sky-600 dark:text-sky-300',
      icon: CirclePlay
    })
    expect(
      rows.find((row) => row.type === 'header' && row.statusSection === 'Research')
    ).toMatchObject({
      tone: 'text-foreground',
      icon: Layers
    })
  })

  it('counts every workspace in the section on its header', () => {
    const header = rowsFor({}).find((row) => row.type === 'header' && row.key === NEEDS_ME_KEY)
    expect(header).toMatchObject({ label: 'Needs me', statusSection: 'Needs me', count: 2 })
  })

  it('hides a collapsed section’s lanes without touching its count', () => {
    expect(summarize(rowsFor({ collapsed: [NEEDS_ME_KEY] }))).toEqual([
      `header ${RESEARCH_KEY}`,
      `header workspace-status:scoping <${RESEARCH_KEY}`,
      'item wt-scope',
      `header ${NEEDS_ME_KEY}`,
      `header ${getWorkspaceStatusSectionGroupKey('Autonomous')}`,
      `header workspace-status:implementing <${getWorkspaceStatusSectionGroupKey('Autonomous')}`,
      'item wt-impl'
    ])
    const header = rowsFor({ collapsed: [NEEDS_ME_KEY] }).find(
      (row) => row.type === 'header' && row.key === NEEDS_ME_KEY
    )
    expect(header).toMatchObject({ count: 2 })
  })

  it('collapses a lane and its section independently', () => {
    expect(summarize(rowsFor({ collapsed: ['workspace-status:my-review'] }))).toEqual([
      `header ${RESEARCH_KEY}`,
      `header workspace-status:scoping <${RESEARCH_KEY}`,
      'item wt-scope',
      `header ${NEEDS_ME_KEY}`,
      `header workspace-status:flagged <${NEEDS_ME_KEY}`,
      'item wt-flag',
      `header workspace-status:my-review <${NEEDS_ME_KEY}`,
      `header ${getWorkspaceStatusSectionGroupKey('Autonomous')}`,
      `header workspace-status:implementing <${getWorkspaceStatusSectionGroupKey('Autonomous')}`,
      'item wt-impl'
    ])
  })

  it('leaves a sectionless lane at top level, in its own position', () => {
    const statuses: WorkspaceStatusDefinition[] = [
      { id: 'scoping', label: 'scoping', section: 'Research' },
      { id: 'flagged', label: 'flagged' },
      { id: 'implementing', label: 'implementing', section: 'Autonomous' }
    ]
    expect(
      summarize(
        rowsFor({
          statuses,
          worktrees: [
            workspace('wt-scope', 'scoping'),
            workspace('wt-flag', 'flagged'),
            workspace('wt-impl', 'implementing')
          ]
        })
      )
    ).toEqual([
      `header ${RESEARCH_KEY}`,
      `header workspace-status:scoping <${RESEARCH_KEY}`,
      'item wt-scope',
      'header workspace-status:flagged',
      'item wt-flag',
      `header ${getWorkspaceStatusSectionGroupKey('Autonomous')}`,
      `header workspace-status:implementing <${getWorkspaceStatusSectionGroupKey('Autonomous')}`,
      'item wt-impl'
    ])
  })

  it('renders an install with no sections exactly as before', () => {
    const statuses = cloneDefaultWorkspaceStatuses()
    const worktrees = [workspace('wt-a', 'in-progress'), workspace('wt-b', 'in-review')]
    expect(summarize(rowsFor({ statuses, worktrees }))).toEqual([
      'header workspace-status:in-progress',
      'item wt-a',
      'header workspace-status:in-review',
      'item wt-b'
    ])
  })
})

describe('reveal keys for a sectioned lane', () => {
  it('opens the section before the lane', () => {
    expect(
      getGroupKeysForWorktree(
        'workspace-status',
        workspace('wt-flag', 'flagged'),
        repoMap,
        null,
        SECTIONED_STATUSES
      )
    ).toEqual([NEEDS_ME_KEY, 'workspace-status:flagged'])
  })

  it('returns the lane alone when it has no section', () => {
    expect(
      getGroupKeysForWorktree(
        'workspace-status',
        workspace('wt-a', 'in-progress'),
        repoMap,
        null,
        cloneDefaultWorkspaceStatuses()
      )
    ).toEqual(['workspace-status:in-progress'])
  })
})

describe('workspace-status sections the user dragged', () => {
  it('renders bands in the saved order instead of attention order', () => {
    const rows = rowsFor({
      sidebarOrder: { sections: ['Needs me'], manualLaneSections: [] }
    })
    expect(
      summarize(rows).filter((entry) => entry.startsWith('header workspace-status-section'))
    ).toEqual([
      `header ${NEEDS_ME_KEY}`,
      `header ${RESEARCH_KEY}`,
      `header ${getWorkspaceStatusSectionGroupKey('Autonomous')}`
    ])
  })

  it('keeps a manual band lanes in the saved order', () => {
    const rows = rowsFor({
      sidebarOrder: { sections: [], manualLaneSections: ['Needs me'] }
    })
    expect(summarize(rows).filter((entry) => entry.includes(`<${NEEDS_ME_KEY}`))).toEqual([
      `header workspace-status:my-review <${NEEDS_ME_KEY}`,
      `header workspace-status:flagged <${NEEDS_ME_KEY}`
    ])
  })
})
