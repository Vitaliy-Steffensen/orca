import { describe, expect, it } from 'vitest'
import {
  SOURCE_CONTROL_SECTIONS,
  moveSourceControlSection,
  orderSourceControlSections,
  toggleSourceControlSectionHidden
} from './source-control-sections'

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
