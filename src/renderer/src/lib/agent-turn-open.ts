import type { AgentTurn } from '../../../shared/agent-turns'
import type { GitCommitCompareResult } from '../../../shared/git-diff-compare-types'
import type { ShowInChanges } from './show-in-changes'

export type AgentTurnOpenDeps = {
  listTurns: (args: { worktreePath: string }) => Promise<AgentTurn[]>
  commitCompare: (args: {
    worktreePath: string
    commitId: string
  }) => Promise<GitCommitCompareResult>
  showInChanges: ShowInChanges
}

export function agentTurnTitle(turn: AgentTurn): string {
  return turn.prompt.trim().split('\n')[0]?.trim() || 'Agent turn'
}

// Why a commit compare: a turn's end snapshot has its start snapshot as parent, so it lists
// exactly the files the turn changed.
export async function openAgentTurn(
  worktreeId: string,
  worktreePath: string,
  turn: AgentTurn,
  latest: boolean,
  deps: Pick<AgentTurnOpenDeps, 'commitCompare' | 'showInChanges'>
): Promise<void> {
  const result = await deps.commitCompare({ worktreePath, commitId: turn.oid })
  if (result.summary.status !== 'ready') {
    throw new Error(result.summary.errorMessage ?? 'The turn could not be loaded.')
  }
  deps.showInChanges(worktreeId, worktreePath, result.summary, result.entries, {
    kind: 'turn',
    prompt: turn.prompt,
    latest
  })
}

export async function openLatestAgentTurn(
  worktreeId: string,
  worktreePath: string,
  deps: AgentTurnOpenDeps
): Promise<boolean> {
  const [latest] = await deps.listTurns({ worktreePath })
  if (!latest) {
    return false
  }
  await openAgentTurn(worktreeId, worktreePath, latest, true, deps)
  return true
}
