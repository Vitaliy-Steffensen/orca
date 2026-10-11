import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { AgentTurn } from '../../../../../../shared/agent-turns'
import { AgentTurnsSection } from './agent-turns-section'

function turn(ref: string, prompt: string): AgentTurn {
  return {
    ref,
    oid: 'b',
    parentOid: 'a',
    prompt,
    agent: 'claude',
    paneKey: 'pane',
    startedAt: 0,
    completedAt: 0,
    files: 1,
    insertions: 1,
    deletions: 0
  }
}

describe('AgentTurnsSection', () => {
  it('lists the turns it is given, so the panel decides whether the section shows', () => {
    const markup = renderToStaticMarkup(
      <AgentTurnsSection
        worktreeId="wt"
        worktreePath="/repo"
        turns={[turn('r1', 'Fix the parser'), turn('r2', 'Add tests')]}
        collapsed={false}
        onToggle={vi.fn()}
      />
    )
    expect(markup).toContain('Fix the parser')
    expect(markup).toContain('Add tests')
  })
})
