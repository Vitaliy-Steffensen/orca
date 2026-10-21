import { describe, expect, it } from 'vitest'
import {
  advanceAutomationHold,
  isAutomationRunFinished,
  DEFAULT_AUTOMATION_HOLD_SETTLE_MS
} from './workspace-automation-hold'
import type { WorkspaceAgentObservation } from './workspace-agent-status-rules'

function agent(state: WorkspaceAgentObservation['state']): WorkspaceAgentObservation {
  return { state, hasQuestion: false, verdict: null, turnStartedAt: 0 }
}

describe('isAutomationRunFinished', () => {
  it('is false when nothing was observed, so no evidence never releases a card', () => {
    expect(isAutomationRunFinished([])).toBe(false)
  })

  it('is false while one agent is still running beside a finished one', () => {
    expect(isAutomationRunFinished([agent('done'), agent('working')])).toBe(false)
  })

  it('is true once every agent is done', () => {
    expect(isAutomationRunFinished([agent('done'), agent('done')])).toBe(true)
  })
})

describe('advanceAutomationHold', () => {
  it('holds a running workspace and clears any earlier finish', () => {
    const outcome = advanceAutomationHold({
      previous: { finishedSince: 1_000 },
      isFinished: false,
      now: 5_000
    })
    expect(outcome.released).toBe(false)
    expect(outcome.entry).toEqual({ finishedSince: null })
  })

  it('keeps holding through the gap between two queued prompts', () => {
    const first = advanceAutomationHold({ previous: null, isFinished: true, now: 0 })
    expect(first.released).toBe(false)
    const restarted = advanceAutomationHold({
      previous: first.entry,
      isFinished: false,
      now: 2_000
    })
    expect(restarted.released).toBe(false)
    const settled = advanceAutomationHold({
      previous: restarted.entry,
      isFinished: true,
      now: 2_000 + DEFAULT_AUTOMATION_HOLD_SETTLE_MS
    })
    // Why not released: the clock restarted when the next prompt began.
    expect(settled.released).toBe(false)
  })

  it('releases once the finish has held for the settle window', () => {
    const first = advanceAutomationHold({ previous: null, isFinished: true, now: 0 })
    const later = advanceAutomationHold({
      previous: first.entry,
      isFinished: true,
      now: DEFAULT_AUTOMATION_HOLD_SETTLE_MS
    })
    expect(later.released).toBe(true)
  })
})
