import { describe, expect, it, vi } from 'vitest'
import type { AgentTurn } from '../../../shared/agent-turns'
import { openLatestAgentTurn } from './agent-turn-open'

function turn(oid: string, prompt: string): AgentTurn {
  return {
    ref: `refs/worktree/orca-turns/${oid}`,
    oid,
    parentOid: `${oid}-start`,
    prompt,
    agent: 'claude',
    paneKey: 'tab:leaf',
    startedAt: 0,
    completedAt: 0,
    files: 1,
    insertions: 1,
    deletions: 0
  }
}

function deps(turns: AgentTurn[]) {
  const summary = {
    status: 'ready' as const,
    commitOid: 'new',
    parentOid: 'new-start',
    compareRef: 'new',
    baseRef: 'new-start',
    changedFiles: 1
  }
  return {
    listTurns: vi.fn(async () => turns),
    commitCompare: vi.fn(async () => ({ summary, entries: [] })),
    showInChanges: vi.fn()
  }
}

describe('openLatestAgentTurn', () => {
  it('shows the newest turn of the workspace in Changes as the latest turn', async () => {
    const d = deps([turn('new', 'Second prompt\nmore'), turn('old', 'First prompt')])
    await expect(openLatestAgentTurn('wt', '/repo', d)).resolves.toBe(true)
    expect(d.commitCompare).toHaveBeenCalledWith({ worktreePath: '/repo', commitId: 'new' })
    expect(d.showInChanges).toHaveBeenCalledWith(
      'wt',
      '/repo',
      expect.objectContaining({ status: 'ready' }),
      [],
      { kind: 'turn', prompt: 'Second prompt\nmore', latest: true }
    )
  })

  it('reports false when the workspace has no turns yet', async () => {
    const d = deps([])
    await expect(openLatestAgentTurn('wt', '/repo', d)).resolves.toBe(false)
    expect(d.showInChanges).not.toHaveBeenCalled()
  })
})
