import { describe, expect, it } from 'vitest'
import {
  assignWorkspaceStatusSection,
  getWorkspaceStatusSection,
  getWorkspaceStatusSectionAppearance,
  getWorkspaceStatusSectionFromGroupKey,
  getWorkspaceStatusSectionGroupKey,
  getWorkspaceStatusSectionOrder,
  hasWorkspaceStatusSections,
  orderWorkspaceStatusesByAttention,
  sanitizeWorkspaceStatusSection,
  updateWorkspaceStatusSectionAppearance
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
  it('orders sections by attention, with first appearance breaking ties', () => {
    expect(getWorkspaceStatusSectionOrder(SECTIONED)).toEqual(['Needs me', 'Autonomous'])
    expect(
      getWorkspaceStatusSectionOrder([
        { id: 'implementing', label: 'Implementing', section: 'Autonomous' },
        { id: 'later', label: 'Later', section: 'Later' },
        { id: 'ask', label: 'Ask', section: 'Ask' },
        { id: 'flagged', label: 'Flagged', section: 'Needs me' }
      ])
    ).toEqual(['Ask', 'Needs me', 'Later', 'Autonomous'])
  })

  it('puts the lanes that need a look above the ones that can wait', () => {
    expect(
      orderWorkspaceStatusesByAttention([
        { id: 'implementing', label: 'Implementing', section: 'Autonomous' },
        { id: 'loose', label: 'Loose' },
        { id: 'skim-implementation', label: 'Skim implementation', section: 'Needs me' },
        { id: 'review-other', label: 'Review other', section: 'Needs me' },
        { id: 'candidates', label: 'Candidates', section: 'Needs me' },
        { id: 'research', label: 'Research', section: 'Ask' }
      ]).map((status) => status.id)
    ).toEqual([
      'research',
      'loose',
      'review-other',
      'skim-implementation',
      'candidates',
      'implementing'
    ])
  })

  it('leaves an already-attentive list untouched', () => {
    const ordered = [
      { id: 'research', label: 'Research', section: 'Research' },
      { id: 'flagged', label: 'Flagged', section: 'Needs me' }
    ]
    expect(orderWorkspaceStatusesByAttention(ordered)).toBe(ordered)
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

  it('keeps a valid section icon and color and drops anything else', () => {
    expect(
      normalizePersistedWorkspaceStatuses([
        {
          id: 'a',
          label: 'A',
          section: 'Needs me',
          sectionIcon: 'circle-alert',
          sectionColor: 'rose'
        },
        {
          id: 'b',
          label: 'B',
          section: 'Autonomous',
          sectionIcon: 'not-an-icon',
          sectionColor: 'nope'
        },
        { id: 'c', label: 'C', section: '   ', sectionIcon: 'circle-play', sectionColor: 'sky' }
      ])
    ).toEqual([
      {
        id: 'a',
        label: 'A',
        color: 'neutral',
        icon: 'circle-dot',
        section: 'Needs me',
        sectionIcon: 'circle-alert',
        sectionColor: 'rose'
      },
      { id: 'b', label: 'B', color: 'blue', icon: 'circle-dot', section: 'Autonomous' },
      { id: 'c', label: 'C', color: 'sky', icon: 'circle-dot' }
    ])
  })
})

describe('section appearance', () => {
  const needsMe = {
    id: 'a',
    label: 'A',
    section: 'Needs me',
    sectionIcon: 'circle-alert',
    sectionColor: 'rose'
  }
  const review = {
    id: 'b',
    label: 'B',
    section: 'Needs me',
    sectionIcon: 'circle-alert',
    sectionColor: 'rose'
  }
  const autonomous = {
    id: 'c',
    label: 'C',
    section: 'Autonomous',
    sectionIcon: 'circle-play',
    sectionColor: 'sky'
  }

  it('reads the shared icon and color for a section', () => {
    expect(getWorkspaceStatusSectionAppearance('Needs me', [needsMe, autonomous])).toEqual({
      icon: 'circle-alert',
      color: 'rose'
    })
    expect(getWorkspaceStatusSectionAppearance('Research', [needsMe])).toEqual({})
  })

  it('gives a lane that joins a section that section’s look', () => {
    expect(assignWorkspaceStatusSection([needsMe, autonomous], 'c', 'Needs me')[1]).toMatchObject({
      section: 'Needs me',
      sectionIcon: 'circle-alert',
      sectionColor: 'rose'
    })
  })

  it('keeps the look when the only lane in a section is renamed', () => {
    expect(assignWorkspaceStatusSection([needsMe], 'a', 'Attention')).toEqual([
      { ...needsMe, section: 'Attention' }
    ])
  })

  it('starts a split-off section without a custom look', () => {
    expect(assignWorkspaceStatusSection([needsMe, review], 'b', 'Later')[1]).toEqual({
      id: 'b',
      label: 'B',
      section: 'Later'
    })
  })

  it('drops the section look when a lane leaves every section', () => {
    expect(assignWorkspaceStatusSection([needsMe], 'a', undefined)).toEqual([
      { id: 'a', label: 'A' }
    ])
  })

  it('writes an appearance onto every lane in the section', () => {
    expect(
      updateWorkspaceStatusSectionAppearance([needsMe, review, autonomous], 'Needs me', {
        icon: 'flag'
      })
    ).toEqual([{ ...needsMe, sectionIcon: 'flag' }, { ...review, sectionIcon: 'flag' }, autonomous])
  })
})
