import { describe, expect, it } from 'vitest'
import {
  moveSourceControlSection,
  orderSourceControlSections,
  toggleSourceControlSectionHidden
} from './source-control-sections'

describe('source control sections', () => {
  it('keeps a saved order, drops unknown ids and adds new sections where they belong by default', () => {
    expect(orderSourceControlSections(undefined)).toEqual([
      'reviewers',
      'pending-review',
      'agent-notes',
      'agent-turns',
      'changes'
    ])
    expect(orderSourceControlSections(['changes', 'gone', 'agent-turns', 'changes'])).toEqual([
      'changes',
      'agent-turns',
      'reviewers',
      'pending-review',
      'agent-notes'
    ])
  })

  it('moves a section before another, or to the end', () => {
    const order = orderSourceControlSections(undefined)
    expect(moveSourceControlSection(order, 'changes', 'reviewers')).toEqual([
      'changes',
      'reviewers',
      'pending-review',
      'agent-notes',
      'agent-turns'
    ])
    expect(moveSourceControlSection(order, 'reviewers', null)).toEqual([
      'pending-review',
      'agent-notes',
      'agent-turns',
      'changes',
      'reviewers'
    ])
    expect(moveSourceControlSection(order, 'agent-turns', 'agent-turns')).toEqual(order)
  })

  it('hides and shows a section', () => {
    expect(toggleSourceControlSectionHidden(undefined, 'commits')).toEqual(['commits'])
    expect(toggleSourceControlSectionHidden(['commits', 'reviewers'], 'commits')).toEqual([
      'reviewers'
    ])
  })
})
