import { useCallback, useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import type { WorkspaceStatusDefinition } from '../../../../shared/worktree/types'
import { getWorkspaceStatusSectionOrder } from '../../../../shared/workspace-status-sections'

export type WorkspaceKanbanSectionFilter = {
  sections: readonly string[]
  hiddenSections: ReadonlySet<string>
  visibleStatuses: readonly WorkspaceStatusDefinition[]
  toggleSection: (section: string) => void
  showAllSections: () => void
}

export function filterWorkspaceStatusesBySection(
  statuses: readonly WorkspaceStatusDefinition[],
  hiddenSections: ReadonlySet<string>
): readonly WorkspaceStatusDefinition[] {
  if (hiddenSections.size === 0) {
    return statuses
  }
  return statuses.filter(
    (status) => status.section === undefined || !hiddenSections.has(status.section)
  )
}

/**
 * Which sections the board shows. The board reads the same `section` field the
 * sidebar groups by, so the two can disagree about what is *visible* but never
 * about which section a lane belongs to.
 */
export function useWorkspaceKanbanSectionFilter(
  workspaceStatuses: readonly WorkspaceStatusDefinition[]
): WorkspaceKanbanSectionFilter {
  const [hiddenSections, setHiddenSections] = useState<ReadonlySet<string>>(() => new Set())
  // Why the sidebar's dragged order: one band order everywhere, so the board's
  // chips and the sidebar's bands never read top-to-bottom differently.
  const savedSections = useAppStore((state) => state.workspaceStatusSidebarOrder.sections)
  const sections = useMemo(
    () => getWorkspaceStatusSectionOrder(workspaceStatuses, savedSections),
    [savedSections, workspaceStatuses]
  )
  // A section the user renamed away must not stay hidden by its old name.
  const liveHiddenSections = useMemo(() => {
    const live = new Set([...hiddenSections].filter((section) => sections.includes(section)))
    return live.size === hiddenSections.size ? hiddenSections : live
  }, [hiddenSections, sections])
  const toggleSection = useCallback((section: string) => {
    setHiddenSections((current) => {
      const next = new Set(current)
      if (!next.delete(section)) {
        next.add(section)
      }
      return next
    })
  }, [])
  const showAllSections = useCallback(() => setHiddenSections(new Set()), [])
  const visibleStatuses = useMemo(
    () => filterWorkspaceStatusesBySection(workspaceStatuses, liveHiddenSections),
    [liveHiddenSections, workspaceStatuses]
  )
  return {
    sections,
    hiddenSections: liveHiddenSections,
    visibleStatuses,
    toggleSection,
    showAllSections
  }
}
