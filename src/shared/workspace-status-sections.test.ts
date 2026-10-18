import { describe, expect, it } from 'vitest'
import {
  getWorkspaceStatusSection,
  getWorkspaceStatusSectionFromGroupKey,
  getWorkspaceStatusSectionGroupKey,
  getWorkspaceStatusSectionOrder,
  hasWorkspaceStatusSections,
  sanitizeWorkspaceStatusSection
} from './workspace-status-sections'
import {
  cloneDefaultWorkspaceStatuses,
  normalizePersistedWorkspaceStatuses
} from './workspace-statuses'

const SECTIONED = [
  { id: 'a', label: 'A', section: 'Needs me' },
  { id: 'b', label: 'B', section: 'Autonomous' },
  { id: 'c', label: 'C', section: 'Needs me' },
  { id: 'd', label: 'D' }
]

describe('sanitizeWorkspaceStatusSection', () => {
  it('collapses whitespace and caps length', () => {
    expect(sanitizeWorkspaceStatusSection('  Needs   me  ')).toBe('Needs me')
    expect(sanitizeWorkspaceStatusSection('x'.repeat(50))).toHaveLength(32)
  })

  it('treats blank and non-string values as no section', () => {
    expect(sanitizeWorkspaceStatusSection('   ')).toBeUndefined()
    expect(sanitizeWorkspaceStatusSection(null)).toBeUndefined()
    expect(sanitizeWorkspaceStatusSection(7)).toBeUndefined()
  })
})

describe('section group keys', () => {
  it('round-trips names that need escaping', () => {
    const key = getWorkspaceStatusSectionGroupKey('Needs me / now')
    expect(getWorkspaceStatusSectionFromGroupKey(key)).toBe('Needs me / now')
  })

  it('does not collide with the lane key namespace', () => {
    expect(getWorkspaceStatusSectionGroupKey('x').startsWith('workspace-status:')).toBe(false)
    expect(getWorkspaceStatusSectionFromGroupKey('workspace-status:in-progress')).toBeNull()
  })
})

describe('section membership', () => {
  it('orders sections by first appearance in the lane order', () => {
    expect(getWorkspaceStatusSectionOrder(SECTIONED)).toEqual(['Needs me', 'Autonomous'])
  })

  it('reports no sections for the stock lanes', () => {
    expect(hasWorkspaceStatusSections(cloneDefaultWorkspaceStatuses())).toBe(false)
    expect(hasWorkspaceStatusSections(SECTIONED)).toBe(true)
  })

  it('reads a lane section, or null when it has none', () => {
    expect(getWorkspaceStatusSection('c', SECTIONED)).toBe('Needs me')
    expect(getWorkspaceStatusSection('d', SECTIONED)).toBeNull()
    expect(getWorkspaceStatusSection('missing', SECTIONED)).toBeNull()
  })
})

describe('persisted normalization', () => {
  it('leaves a sectionless payload byte-identical', () => {
    const stored = cloneDefaultWorkspaceStatuses()
    expect(JSON.stringify(normalizePersistedWorkspaceStatuses(stored))).toBe(JSON.stringify(stored))
  })

  it('keeps and sanitizes a stored section', () => {
    expect(
      normalizePersistedWorkspaceStatuses([
        { id: 'a', label: 'A', section: '  Needs   me ' },
        { id: 'b', label: 'B', section: '  ' }
      ])
    ).toEqual([
      { id: 'a', label: 'A', color: 'neutral', icon: 'circle-dot', section: 'Needs me' },
      { id: 'b', label: 'B', color: 'blue', icon: 'circle-dot' }
    ])
  })
})
