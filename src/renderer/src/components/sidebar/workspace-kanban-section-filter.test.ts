import { describe, expect, it } from 'vitest'
import { filterWorkspaceStatusesBySection } from './workspace-kanban-section-filter'
import type { WorkspaceStatusDefinition } from '../../../../shared/worktree/types'

const STATUSES: WorkspaceStatusDefinition[] = [
  { id: 'scoping', label: 'scoping', section: 'Research' },
  { id: 'my-review', label: 'my review', section: 'Needs me' },
  { id: 'loose', label: 'loose' }
]

describe('filterWorkspaceStatusesBySection', () => {
  it('returns the same array when nothing is hidden', () => {
    expect(filterWorkspaceStatusesBySection(STATUSES, new Set())).toBe(STATUSES)
  })

  it('drops only the lanes in a hidden section', () => {
    expect(
      filterWorkspaceStatusesBySection(STATUSES, new Set(['Research'])).map((s) => s.id)
    ).toEqual(['my-review', 'loose'])
  })

  it('never hides a sectionless lane', () => {
    expect(
      filterWorkspaceStatusesBySection(STATUSES, new Set(['Research', 'Needs me'])).map((s) => s.id)
    ).toEqual(['loose'])
  })
})
