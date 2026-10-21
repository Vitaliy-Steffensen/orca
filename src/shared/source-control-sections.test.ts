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
      ['pr-review-plan', 'Review plan'],
      ['pr-comments', 'Comments'],
      ['pr-resolved', 'Resolved']
    ])
    expect(orderPrPanelSections(['pr-comments', 'changes'])).toEqual([
      'pr-comments',
      'pr-attention',
      'pr-checks',
      'pr-pending-review',
      'pr-review-plan',
      'pr-resolved'
    ])
    expect(moveSourceControlSection(orderPrPanelSections(undefined), 'pr-checks', null)).toEqual([
      'pr-attention',
      'pr-pending-review',
      'pr-review-plan',
      'pr-comments',
      'pr-resolved',
      'pr-checks'
    ])
  })

  // Why: a layout saved before this section existed names every other id, so an order that simply
  // honoured the saved list would drop Review plan out of the panel for every existing user.
  it('appends Review plan to an order saved before it existed', () => {
    expect(
      orderPrPanelSections([
        'pr-attention',
        'pr-checks',
        'pr-pending-review',
        'pr-comments',
        'pr-resolved'
      ])
    ).toEqual([
      'pr-attention',
      'pr-checks',
      'pr-pending-review',
      'pr-comments',
      'pr-resolved',
      'pr-review-plan'
    ])
  })
})

describe('source control sections', () => {
  it('keeps the review form in Review and your unsent review comments in their own section', () => {
    expect(SOURCE_CONTROL_SECTIONS.map((section) => [section.id, section.label])).toEqual([
      ['pending-review', 'Review'],
      ['pending-comments', 'Pending review'],
      ['agent-notes', 'Agent notes'],
      ['agent-turns', 'Agent turns'],
      ['changes', 'Changes'],
      ['staged', 'Staged Changes'],
      ['unstaged', 'Unstaged Changes'],
      ['commits', 'Commits']
    ])
  })

  it('keeps a saved order, drops unknown ids and adds new sections where they belong by default', () => {
    expect(orderSourceControlSections(undefined)).toEqual([
      'pending-review',
      'pending-comments',
      'agent-notes',
      'agent-turns',
      'changes',
      'staged',
      'unstaged'
    ])
    expect(orderSourceControlSections(['changes', 'reviewers', 'agent-turns', 'changes'])).toEqual([
      'changes',
      'agent-turns',
      'pending-review',
      'pending-comments',
      'agent-notes',
      'staged',
      'unstaged'
    ])
  })

  it('moves a section before another, or to the end', () => {
    const order = orderSourceControlSections(undefined)
    expect(moveSourceControlSection(order, 'changes', 'pending-review')).toEqual([
      'changes',
      'pending-review',
      'pending-comments',
      'agent-notes',
      'agent-turns',
      'staged',
      'unstaged'
    ])
    expect(moveSourceControlSection(order, 'pending-review', null)).toEqual([
      'pending-comments',
      'agent-notes',
      'agent-turns',
      'changes',
      'staged',
      'unstaged',
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
