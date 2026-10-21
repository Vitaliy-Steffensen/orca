import { describe, expect, it } from 'vitest'
import { applyAutomationHoldLane } from './workspace-automation-lane'

const STATUSES = [
  { id: 'todo', label: 'Todo' },
  { id: 'automations', label: 'Automations' },
  { id: 'reviewing-others', label: 'Reviewing others' }
]

describe('applyAutomationHoldLane', () => {
  it('holds the chosen lane and nothing else', () => {
    expect(applyAutomationHoldLane(STATUSES, 'automations')).toEqual([
      { id: 'todo', label: 'Todo' },
      { id: 'automations', label: 'Automations', holdsAutomation: true },
      { id: 'reviewing-others', label: 'Reviewing others' }
    ])
  })

  it('takes the hold back off a lane that is no longer chosen', () => {
    const held = applyAutomationHoldLane(STATUSES, 'automations')
    expect(applyAutomationHoldLane(held, 'todo')).toEqual([
      { id: 'todo', label: 'Todo', holdsAutomation: true },
      { id: 'automations', label: 'Automations' },
      { id: 'reviewing-others', label: 'Reviewing others' }
    ])
  })

  it('clears every hold when no lane is chosen', () => {
    const held = applyAutomationHoldLane(STATUSES, 'automations')
    expect(applyAutomationHoldLane(held, null)).toEqual(STATUSES)
  })

  it('keeps the other lane flags', () => {
    expect(
      applyAutomationHoldLane([{ id: 'automations', label: 'Automations', autoPull: true }], null)
    ).toEqual([{ id: 'automations', label: 'Automations', autoPull: true }])
  })
})
