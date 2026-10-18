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

function headerContext(groupBy: WorktreeGroupBy): SectionHeaderRowContext {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the header row reads only the fields set here; the rest of the context belongs to row kinds this test never renders.
  return {
    groupBy,
    collapsedGroups: new Set(),
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
      projectGroupDrag: { state: { draggingGroupId: null } }
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
  groupBy: WorktreeGroupBy = 'workspace-status'
): Promise<HTMLDivElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(
      renderWorktreeSectionHeaderRow({
        ctx: headerContext(groupBy),
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

  it('shows how many workspaces sit in a nested status lane', async () => {
    const container = await renderHeader(
      headerRow({ parentKey: 'workspace-status-section:Needs%20me' })
    )

    expect(countBadge(container)).toBe('4')
  })

  it('shows the total on the outer section band', async () => {
    const container = await renderHeader(
      headerRow({
        key: 'workspace-status-section:Needs%20me',
        label: 'Needs me',
        statusSection: 'Needs me',
        count: 11
      })
    )

    expect(countBadge(container)).toBe('11')
  })

  it('leaves a top-level status lane without a count pill', async () => {
    const container = await renderHeader(headerRow({}))

    expect(countBadge(container)).toBeNull()
  })
})
