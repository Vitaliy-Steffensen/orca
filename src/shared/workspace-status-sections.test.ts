import { describe, expect, it } from 'vitest'
import {
  assignWorkspaceStatusSection,
  getWorkspaceStatusSection,
  getWorkspaceStatusSectionAppearance,
  getWorkspaceStatusSectionFromGroupKey,
  getWorkspaceStatusSectionGroupKey,
  getWorkspaceStatusSectionOrder,
  hasWorkspaceStatusSections,
  moveWorkspaceStatusWithinSection,
  renameWorkspaceStatusSection,
  orderWorkspaceStatusesByAttention,
  sanitizeWorkspaceStatusSection,
  updateWorkspaceStatusSectionAppearance
} from './workspace-status-sections'
import {
  createDefaultWorkspaceStatusSidebarOrder,
  moveWorkspaceStatusSectionInOrder,
  normalizeWorkspaceStatusSidebarOrder,
  reorderWorkspaceStatusLanesInSection
} from './workspace-status-sidebar-order'
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

describe('renameWorkspaceStatusSection', () => {
  const lanes = [
    { id: 'a', label: 'A', section: 'Needs me', sectionIcon: 'bell', sectionColor: 'amber' },
    { id: 'b', label: 'B', section: 'Needs me', sectionIcon: 'bell', sectionColor: 'amber' },
    { id: 'c', label: 'C', section: 'Auto', sectionColor: 'blue' },
    { id: 'd', label: 'D' }
  ]

  it('renames every lane and keeps the section look', () => {
    const next = renameWorkspaceStatusSection(lanes, 'Needs me', 'Mine')
    expect(next.filter((lane) => lane.section === 'Mine')).toHaveLength(2)
    expect(next[0]?.sectionColor).toBe('amber')
  })

  it('merges into an existing section and adopts its look', () => {
    const next = renameWorkspaceStatusSection(lanes, 'Needs me', 'Auto')
    expect(next.filter((lane) => lane.section === 'Auto')).toHaveLength(3)
    expect(next[0]?.sectionColor).toBe('blue')
  })

  it('dissolves the section when the name is empty', () => {
    const next = renameWorkspaceStatusSection(lanes, 'Needs me', undefined)
    expect(next[0]?.section).toBeUndefined()
  })
})

describe('moveWorkspaceStatusWithinSection', () => {
  const lanes = [
    { id: 'a', label: 'A', section: 'X' },
    { id: 'b', label: 'B', section: 'Y' },
    { id: 'c', label: 'C', section: 'X' }
  ]

  it('swaps with the nearest lane in the same section', () => {
    expect(moveWorkspaceStatusWithinSection(lanes, 'a', 1).map((lane) => lane.id)).toEqual([
      'c',
      'b',
      'a'
    ])
  })

  it('does nothing at the edge of a section', () => {
    expect(moveWorkspaceStatusWithinSection(lanes, 'a', -1)).toEqual(lanes)
  })
})

describe('user-dragged sidebar order', () => {
  const LANES = [
    { id: 'research', label: 'Research', section: 'Ask' },
    { id: 'review-other', label: 'Review other', section: 'Needs me' },
    { id: 'my-review', label: 'My review', section: 'Needs me' },
    { id: 'implementing', label: 'Implementing', section: 'Autonomous' }
  ]

  it('puts a dragged band above the one attention rank would pick', () => {
    expect(getWorkspaceStatusSectionOrder(LANES, ['Autonomous'])).toEqual([
      'Autonomous',
      'Ask',
      'Needs me'
    ])
  })

  it('ignores a saved name whose section no longer exists', () => {
    expect(getWorkspaceStatusSectionOrder(LANES, ['Gone', 'Needs me'])).toEqual([
      'Needs me',
      'Ask',
      'Autonomous'
    ])
  })

  it('moves a band and leaves the others in rendered order', () => {
    expect(
      moveWorkspaceStatusSectionInOrder(
        ['Ask', 'Needs me', 'Autonomous'],
        createDefaultWorkspaceStatusSidebarOrder(),
        'Needs me',
        0
      ).sections
    ).toEqual(['Needs me', 'Ask', 'Autonomous'])
  })

  it('reorders one band lanes and leaves every other slot alone', () => {
    const next = reorderWorkspaceStatusLanesInSection(LANES, 'Needs me', [
      'my-review',
      'review-other'
    ])
    expect(next.map((lane) => lane.id)).toEqual([
      'research',
      'my-review',
      'review-other',
      'implementing'
    ])
  })

  it('keeps a manual band saved order while a sibling band stays ranked', () => {
    const lanes = [
      { id: 'candidates', label: 'Candidates', section: 'Needs me' },
      { id: 'review-other', label: 'Review other', section: 'Needs me' },
      { id: 'waiting-on-ci', label: 'Waiting on CI', section: 'Autonomous' },
      { id: 'implementing', label: 'Implementing', section: 'Autonomous' }
    ]
    expect(
      orderWorkspaceStatusesByAttention(lanes, {
        sections: [],
        manualLaneSections: ['Needs me']
      }).map((lane) => lane.id)
    ).toEqual(['candidates', 'review-other', 'implementing', 'waiting-on-ci'])
  })

  it('still returns the same array when nothing is saved and nothing moves', () => {
    const ordered = [
      { id: 'research', label: 'Research', section: 'Research' },
      { id: 'flagged', label: 'Flagged', section: 'Needs me' }
    ]
    expect(
      orderWorkspaceStatusesByAttention(ordered, createDefaultWorkspaceStatusSidebarOrder())
    ).toBe(ordered)
  })
})

describe('normalizeWorkspaceStatusSidebarOrder', () => {
  it('drops blanks, duplicates and non-strings', () => {
    expect(
      normalizeWorkspaceStatusSidebarOrder({
        sections: ['Ask', '  Ask ', '   ', 7, 'Needs  me'],
        manualLaneSections: ['Needs me']
      })
    ).toEqual({ sections: ['Ask', 'Needs me'], manualLaneSections: ['Needs me'] })
  })

  it('falls back to an empty order for junk', () => {
    expect(normalizeWorkspaceStatusSidebarOrder(null)).toEqual({
      sections: [],
      manualLaneSections: []
    })
  })
})
