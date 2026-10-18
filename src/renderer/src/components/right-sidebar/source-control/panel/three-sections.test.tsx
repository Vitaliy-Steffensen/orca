// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { GitStatusEntry } from '../../../../../../shared/git-status-types'
import { SourceControlAllChangesSection } from '../listing/all-changes-section'
import { SourceControlUncommittedSections } from '../listing/uncommitted-sections'
import type {
  SourceControlDisplaySection,
  SourceControlDisplaySectionId
} from '../listing/section-order'

afterEach(cleanup)

const staged: GitStatusEntry = { path: 'src/staged.ts', status: 'modified', area: 'staged' }
const unstaged: GitStatusEntry = { path: 'src/unstaged.ts', status: 'modified', area: 'unstaged' }
const untracked: GitStatusEntry = { path: 'src/new.ts', status: 'untracked', area: 'untracked' }

function renderUncommitted(sections: SourceControlDisplaySection[]): void {
  const unfilteredById = new Map<SourceControlDisplaySectionId, SourceControlDisplaySection>(
    sections.map((section) => [section.id, section])
  )
  const listRows = Object.fromEntries(
    sections.map((section) => [
      section.id,
      section.items.map((entry) => ({ type: 'entry' as const, entry }))
    ])
  )
  render(
    <TooltipProvider>
      <SourceControlUncommittedSections
        displaySections={sections}
        unfilteredDisplaySectionsById={unfilteredById}
        normalizedFilter=""
        collapsedSections={new Set()}
        toggleSection={vi.fn()}
        onViewSection={vi.fn()}
        isExecutingBulk={false}
        requestDiscardAllInArea={vi.fn()}
        handleStageAllPaths={vi.fn()}
        handleStageSectionPaths={vi.fn()}
        isStatusTruncated={false}
        handleUnstagePaths={vi.fn()}
        sourceControlViewMode="list"
        visibleTreeRowsBySection={{}}
        visibleListRowsBySection={listRows}
        fileListScrollElement={null}
        collapsedTreeDirs={new Set()}
        toggleTreeDir={vi.fn()}
        requestDiscardPaths={vi.fn()}
        expandedSubmoduleKeys={new Set()}
        toggleSubmodule={vi.fn()}
        currentWorktreeId="wt"
        worktreePath="/repo"
        selectedKeySet={new Set()}
        activeOpenRowKeys={new Set()}
        activeOpenRowKey={null}
        handleSelect={vi.fn()}
        handleContextMenu={vi.fn()}
        revealInExplorer={vi.fn()}
        activeConnectionId={null}
        handleOpenDiff={vi.fn()}
        handleStage={vi.fn()}
        handleUnstage={vi.fn()}
        requestDiscardEntry={vi.fn()}
        diffCommentCountByPath={new Map()}
        reviewThreadCountByPath={new Map()}
        pendingReviewCountByPath={new Map()}
      />
    </TooltipProvider>
  )
}

describe('source control file sections', () => {
  it('renders Changes, Staged Changes and Unstaged Changes, with untracked rows under Unstaged', () => {
    render(
      <SourceControlAllChangesSection
        baseRef="origin/main"
        entries={[
          { path: 'src/staged.ts', status: 'modified' },
          { path: 'src/unstaged.ts', status: 'modified' },
          { path: 'src/new.ts', status: 'added' }
        ]}
        totalEntryCount={3}
        collapsed={false}
        onToggle={vi.fn()}
        sourceControlViewMode="list"
        visibleTreeRows={[]}
        fileListScrollElement={null}
        collapsedTreeDirs={new Set()}
        toggleTreeDir={vi.fn()}
        currentWorktreeId="wt"
        worktreePath="/repo"
        revealInExplorer={vi.fn()}
        activeConnectionId={null}
        onOpen={vi.fn()}
        diffCommentCountByPath={new Map()}
        reviewThreadCountByPath={new Map()}
        pendingReviewCountByPath={new Map()}
        activeOpenRowKeys={new Set()}
        activeOpenRowKey={null}
      />
    )
    renderUncommitted([{ id: 'staged', area: 'staged', items: [staged] }])
    renderUncommitted([
      {
        id: 'unstaged',
        area: 'unstaged',
        items: [unstaged, untracked]
      }
    ])

    const headers = ['Changes', 'Staged Changes', 'Unstaged Changes'].map((label) =>
      screen.getByTitle(label)
    )
    expect(headers).toHaveLength(3)
    expect(screen.queryByTitle('Untracked Files')).toBeNull()
    expect(screen.queryByTitle('Committed')).toBeNull()

    const untrackedRow = document.querySelector<HTMLElement>(
      '[data-source-control-area="untracked"]'
    )
    expect(untrackedRow).toBeTruthy()
    expect(untrackedRow?.querySelector('[aria-label="Delete untracked file"]')).toBeTruthy()
    expect(untrackedRow?.querySelector('[aria-label="Stage"]')).toBeTruthy()
    const unstagedRow = document.querySelector<HTMLElement>('[data-source-control-area="unstaged"]')
    expect(unstagedRow?.querySelector('[aria-label="Discard changes"]')).toBeTruthy()

    const unstagedHeader = screen.getByTitle('Unstaged Changes')
    const unstagedSection = unstagedHeader.closest('div')?.parentElement?.parentElement
    expect(unstagedSection?.contains(untrackedRow)).toBe(true)
    expect(unstagedSection?.querySelector('[aria-label="Delete all untracked"]')).toBeTruthy()
    expect(unstagedSection?.querySelector('[aria-label="Discard all"]')).toBeTruthy()
  })
})
