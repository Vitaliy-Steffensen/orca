// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { VirtualItem } from '@tanstack/react-virtual'
import { renderWorktreeSectionHeaderRow, type SectionHeaderRowContext } from './SectionHeader'
import type { GroupHeaderRow, WorktreeGroupBy } from '../grouping/row-types'

const roots: Root[] = []

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the header row reads only the virtual item's start and size.
const vItem = {
  key: 'row',
  index: 0,
  start: 0,
  size: 28,
  end: 28,
  lane: 0
} as VirtualItem

function headerContext(
  groupBy: WorktreeGroupBy,
  options: { collapsedKeys?: readonly string[] } = {}
): SectionHeaderRowContext {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the header row reads only the fields set here; the rest of the context belongs to row kinds this test never renders.
  return {
    groupBy,
    collapsedGroups: new Set(options.collapsedKeys ?? []),
    workspaceStatuses: [{ id: 'review-other', label: 'Review other', section: 'Needs me' }],
    projectGroups: [],
    getRepoSshGate: () => ({
      blocked: false,
      reason: null
    }),
    highlightedRevealRowKey: null,
    dragOverStatus: null,
    pinDragOver: false,
    headerDrag: {
      repoHeaderIndexByRepoId: new Map(),
      repoHeaderBucketByRepoId: new Map(),
      projectGroupHeaderIndexByGroupId: new Map(),
      projectGroupHeaderBucketByGroupId: new Map(),
      canReorderRepoHeaders: false,
      sidebarRepoHeaderIdsByBucket: new Map(),
      canReorderProjectGroupHeaders: false,
      sidebarProjectGroupHeaderIdsByBucket: new Map(),
      repoDrag: { state: { draggingRepoId: null } },
      projectGroupDrag: { state: { draggingGroupId: null } },
      canReorderStatusHeaders: true,
      sidebarStatusHeaderKeysByBucket: new Map([
        [
          'workspace-status-sections',
          ['workspace-status-section:Needs%20me', 'workspace-status-section:Autonomous']
        ],
        [
          'workspace-status-section:Needs%20me',
          ['workspace-status:review-other', 'workspace-status:my-review']
        ]
      ]),
      statusHeaderIndexByKey: new Map([
        ['workspace-status-section:Needs%20me', 0],
        ['workspace-status:review-other', 0]
      ]),
      statusHeaderBucketByKey: new Map([
        ['workspace-status-section:Needs%20me', 'workspace-status-sections'],
        ['workspace-status:review-other', 'workspace-status-section:Needs%20me']
      ]),
      statusHeaderSectionEndByKey: new Map(),
      statusDrag: { state: { draggingHeaderKey: null }, onHandlePointerDown: () => {} }
    },
    getCachedFolderWorkspacePathStatus: () => null,
    toggleGroupWithScrollAnchor: () => {},
    projectActions: {
      onCreateForRepo: () => {},
      onRename: () => {},
      onRemove: () => {}
    },
    onRenameProjectGroup: () => {},
    onDeleteProjectGroup: () => {},
    onCreateFolderWorkspace: () => {},
    onWorkspaceStatusDragOver: () => {},
    onWorkspaceStatusDragLeave: () => {},
    onWorkspacePinDragOver: () => {},
    onWorkspacePinDragLeave: () => {},
    onWorkspaceStatusDrop: () => {}
  } as unknown as SectionHeaderRowContext
}

function headerRow(overrides: Partial<GroupHeaderRow>): GroupHeaderRow {
  return {
    type: 'header',
    key: 'workspace-status:review-other',
    label: 'Review other',
    count: 4,
    tone: 'text-muted-foreground',
    ...overrides
  }
}

async function renderHeader(
  row: GroupHeaderRow,
  groupBy: WorktreeGroupBy = 'workspace-status',
  options: { collapsedKeys?: readonly string[] } = {}
): Promise<HTMLDivElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(
      renderWorktreeSectionHeaderRow({
        ctx: headerContext(groupBy, options),
        row,
        vItem,
        isActiveStickyHeader: false,
        hasStickyHost: false,
        hasHeaderTopSpacing: false,
        measureVirtualRowElement: () => {}
      })
    )
  })
  return container
}

function countBadge(container: HTMLElement): string | null {
  return container.querySelector('.tabular-nums')?.textContent ?? null
}

describe('workspace section counts', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
  })

  afterEach(async () => {
    for (const root of roots.splice(0)) {
      await act(async () => root.unmount())
    }
    document.body.innerHTML = ''
  })

  it('shows how many workspaces a collapsed nested status lane holds', async () => {
    const container = await renderHeader(
      headerRow({ parentKey: 'workspace-status-section:Needs%20me' }),
      'workspace-status',
      { collapsedKeys: ['workspace-status:review-other'] }
    )

    expect(countBadge(container)).toBe('4')
  })

  it('drops the pill once the lane is open and its workspaces are visible', async () => {
    const container = await renderHeader(
      headerRow({ parentKey: 'workspace-status-section:Needs%20me' })
    )

    expect(countBadge(container)).toBeNull()
  })

  it('shows the total on a collapsed section band', async () => {
    const container = await renderHeader(
      headerRow({
        key: 'workspace-status-section:Needs%20me',
        label: 'Needs me',
        statusSection: 'Needs me',
        count: 11
      }),
      'workspace-status',
      { collapsedKeys: ['workspace-status-section:Needs%20me'] }
    )

    expect(countBadge(container)).toBe('11')
  })

  it('leaves a top-level status lane without a count pill', async () => {
    const container = await renderHeader(headerRow({}), 'workspace-status', {
      collapsedKeys: ['workspace-status:review-other']
    })

    expect(countBadge(container)).toBeNull()
  })
})

describe('workspace status header reordering', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
  })

  afterEach(async () => {
    for (const root of roots.splice(0)) {
      await act(async () => root.unmount())
    }
    document.body.innerHTML = ''
  })

  it('arms drag on a section band that has a peer', async () => {
    const container = await renderHeader(
      headerRow({
        key: 'workspace-status-section:Needs%20me',
        label: 'Needs me',
        statusSection: 'Needs me',
        count: 11
      })
    )

    const header = container.querySelector('[data-workspace-status-header-id]')
    expect(header?.getAttribute('data-workspace-status-header-bucket')).toBe(
      'workspace-status-sections'
    )
    expect(header?.hasAttribute('data-workspace-status-header-drag-handle')).toBe(true)
  })

  it('arms drag on a lane nested in a band with a peer lane', async () => {
    const container = await renderHeader(
      headerRow({ parentKey: 'workspace-status-section:Needs%20me' })
    )

    const header = container.querySelector('[data-workspace-status-header-id]')
    expect(header?.getAttribute('data-workspace-status-header-bucket')).toBe(
      'workspace-status-section:Needs%20me'
    )
    expect(header?.hasAttribute('data-workspace-status-header-drag-handle')).toBe(true)
  })

  it('leaves a header outside every reorder bucket undraggable', async () => {
    const container = await renderHeader(
      headerRow({ key: 'workspace-status:lonely', label: 'Lonely' })
    )

    expect(container.querySelector('[data-workspace-status-header-id]')).toBeNull()
  })

  it('keeps the lane header a drop target for workspaces', async () => {
    const container = await renderHeader(
      headerRow({ parentKey: 'workspace-status-section:Needs%20me' })
    )

    expect(container.querySelector('[data-workspace-status-drop-target]')).not.toBeNull()
  })
})
