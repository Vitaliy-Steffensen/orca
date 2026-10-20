import { describe, expect, it } from 'vitest'
import type { ChangesFilter } from '@/lib/changes-filter'
import { shouldShowSourceControlAllChangesSection } from './panel-content'

const commit: ChangesFilter = {
  kind: 'commit',
  compare: { commitOid: 'c2', parentOid: 'c1', compareRef: 'c2', baseRef: 'c1' },
  entries: []
}

describe('shouldShowSourceControlAllChangesSection', () => {
  it('keeps Local changes on its staged and unstaged sections', () => {
    expect(shouldShowSourceControlAllChangesSection('local', null)).toBe(false)
    expect(shouldShowSourceControlAllChangesSection('local', { kind: 'uncommitted' })).toBe(false)
    expect(shouldShowSourceControlAllChangesSection('local', { kind: 'unstaged' })).toBe(false)
  })

  it('shows a previewed commit or turn in Local changes', () => {
    expect(shouldShowSourceControlAllChangesSection('local', commit)).toBe(true)
  })

  it('shows the branch list in Pull request until a preview replaces it', () => {
    expect(shouldShowSourceControlAllChangesSection('pull-request', null)).toBe(true)
    expect(shouldShowSourceControlAllChangesSection('pull-request', commit)).toBe(false)
  })
})
