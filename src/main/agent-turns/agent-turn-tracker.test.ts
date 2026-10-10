import { describe, expect, it } from 'vitest'
import { createAgentTurnTracker } from './agent-turn-tracker'

const base = { paneKey: 'tab:leaf', worktreePath: '/repo', agent: 'claude' }

describe('agent turn tracker', () => {
  it('starts a turn on a new prompt and ends it when the agent is done', () => {
    const tracker = createAgentTurnTracker()
    expect(
      tracker.observe({ ...base, state: 'working', turnStartedAt: 10, prompt: 'fix it' })
    ).toEqual([{ kind: 'start', paneKey: 'tab:leaf', worktreePath: '/repo' }])
    expect(tracker.observe({ ...base, state: 'working', turnStartedAt: 10 })).toEqual([])
    expect(tracker.observe({ ...base, state: 'blocked', turnStartedAt: 10 })).toEqual([])
    expect(tracker.observe({ ...base, state: 'done', turnStartedAt: 10 })).toEqual([
      {
        kind: 'end',
        paneKey: 'tab:leaf',
        worktreePath: '/repo',
        prompt: 'fix it',
        agent: 'claude',
        startedAt: 10
      }
    ])
  })

  it('ignores a done with no turn it saw start', () => {
    const tracker = createAgentTurnTracker()
    expect(tracker.observe({ ...base, state: 'done', turnStartedAt: 10 })).toEqual([])
  })

  it('keeps a prompt sent while the agent is working in the same turn', () => {
    const tracker = createAgentTurnTracker()
    tracker.observe({ ...base, state: 'working', turnStartedAt: 10, prompt: 'first' })
    expect(
      tracker.observe({ ...base, state: 'working', turnStartedAt: 20, prompt: 'steer' })
    ).toEqual([])
    expect(tracker.observe({ ...base, state: 'done', turnStartedAt: 20 })).toEqual([
      expect.objectContaining({ kind: 'end', prompt: 'first', startedAt: 10 })
    ])
  })

  it('resumes the finished turn when the agent wakes up again on the same prompt', () => {
    const tracker = createAgentTurnTracker()
    tracker.observe({ ...base, state: 'working', turnStartedAt: 10, prompt: 'fix it' })
    tracker.observe({ ...base, state: 'done', turnStartedAt: 10 })
    expect(
      tracker.observe({ ...base, state: 'working', turnStartedAt: 20, prompt: 'fix it' })
    ).toEqual([{ kind: 'resume', paneKey: 'tab:leaf', worktreePath: '/repo' }])
    expect(tracker.observe({ ...base, state: 'done', turnStartedAt: 20 })).toEqual([
      expect.objectContaining({ kind: 'end', prompt: 'fix it', startedAt: 10 })
    ])
    expect(tracker.observe({ ...base, state: 'working', turnStartedAt: 30 })).toEqual([
      { kind: 'resume', paneKey: 'tab:leaf', worktreePath: '/repo' }
    ])
  })

  it('resumes after a steered turn, since the wake-up carries the steering prompt', () => {
    const tracker = createAgentTurnTracker()
    tracker.observe({ ...base, state: 'working', turnStartedAt: 10, prompt: 'first' })
    tracker.observe({ ...base, state: 'working', turnStartedAt: 20, prompt: 'steer' })
    tracker.observe({ ...base, state: 'done', turnStartedAt: 20 })
    expect(
      tracker.observe({ ...base, state: 'working', turnStartedAt: 30, prompt: 'steer' })
    ).toEqual([{ kind: 'resume', paneKey: 'tab:leaf', worktreePath: '/repo' }])
    expect(tracker.observe({ ...base, state: 'done', turnStartedAt: 30 })).toEqual([
      expect.objectContaining({ kind: 'end', prompt: 'first', startedAt: 10 })
    ])
  })

  it('starts a new turn for a new prompt after the agent finished', () => {
    const tracker = createAgentTurnTracker()
    tracker.observe({ ...base, state: 'working', turnStartedAt: 10, prompt: 'first' })
    tracker.observe({ ...base, state: 'done', turnStartedAt: 10 })
    expect(
      tracker.observe({ ...base, state: 'working', turnStartedAt: 20, prompt: 'second' })
    ).toEqual([{ kind: 'start', paneKey: 'tab:leaf', worktreePath: '/repo' }])
  })

  it('keeps panes apart', () => {
    const tracker = createAgentTurnTracker()
    tracker.observe({ ...base, state: 'working', turnStartedAt: 10, prompt: 'a' })
    tracker.observe({ ...base, paneKey: 'other', state: 'working', turnStartedAt: 11, prompt: 'b' })
    expect(tracker.observe({ ...base, state: 'done', turnStartedAt: 10 })).toEqual([
      expect.objectContaining({ kind: 'end', paneKey: 'tab:leaf', prompt: 'a' })
    ])
  })
})
