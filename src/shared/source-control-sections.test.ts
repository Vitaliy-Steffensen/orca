import { describe, expect, it } from 'vitest'
import {
  PR_PANEL_SECTIONS,
  SOURCE_CONTROL_SECTIONS,
  moveSourceControlSection,
  orderPrPanelSections,
  orderSourceControlSections,
  toggleSourceControlSectionHidden
} from './source-control-sections'

describe('PR panel sections', () => {
  it('lists the sections under the review header, all movable, in their default order', () => {
    expect(PR_PANEL_SECTIONS.map((section) => [section.id, section.label])).toEqual([
      ['pr-attention', 'Needs attention'],
      ['pr-checks', 'Checks'],
      ['pr-pending-review', 'Pending review'],
      ['pr-comments', 'Comments'],
      ['pr-resolved', 'Resolved']
    ])
    expect(orderPrPanelSections(['pr-comments', 'changes'])).toEqual([
      'pr-comments',
      'pr-attention',
      'pr-checks',
      'pr-pending-review',
      'pr-resolved'
    ])
    expect(moveSourceControlSection(orderPrPanelSections(undefined), 'pr-checks', null)).toEqual([
      'pr-attention',
      'pr-pending-review',
      'pr-comments',
      'pr-resolved',
      'pr-checks'
    ])
  })
})

describe('source control sections', () => {
  it('keeps reviewers and the pending review in one Review section', () => {
    expect(SOURCE_CONTROL_SECTIONS.map((section) => [section.id, section.label])).toEqual([
      ['pending-review', 'Review'],
      ['agent-notes', 'Agent notes'],
      ['agent-turns', 'Agent turns'],
      ['changes', 'Changes'],
      ['commits', 'Commits']
    ])
  })

  it('keeps a saved order, drops unknown ids and adds new sections where they belong by default', () => {
    expect(orderSourceControlSections(undefined)).toEqual([
      'pending-review',
      'agent-notes',
      'agent-turns',
      'changes'
    ])
    expect(orderSourceControlSections(['changes', 'reviewers', 'agent-turns', 'changes'])).toEqual([
      'changes',
      'agent-turns',
      'pending-review',
      'agent-notes'
    ])
  })

  it('moves a section before another, or to the end', () => {
    const order = orderSourceControlSections(undefined)
    expect(moveSourceControlSection(order, 'changes', 'pending-review')).toEqual([
      'changes',
      'pending-review',
      'agent-notes',
      'agent-turns'
    ])
    expect(moveSourceControlSection(order, 'pending-review', null)).toEqual([
      'agent-notes',
      'agent-turns',
      'changes',
      'pending-review'
    ])
    expect(moveSourceControlSection(order, 'agent-turns', 'agent-turns')).toEqual(order)
  })

  it('hides and shows a section', () => {
    expect(toggleSourceControlSectionHidden(undefined, 'commits')).toEqual(['commits'])
    expect(toggleSourceControlSectionHidden(['commits', 'agent-notes'], 'commits')).toEqual([
      'agent-notes'
    ])
  })
})
