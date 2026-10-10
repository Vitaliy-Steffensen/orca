export type AgentTurnObservation = {
  paneKey: string
  worktreePath: string
  agent: string
  state: string
  turnStartedAt?: number
  prompt?: string
}

export type AgentTurnAction =
  | { kind: 'start'; paneKey: string; worktreePath: string }
  | { kind: 'resume'; paneKey: string; worktreePath: string }
  | {
      kind: 'end'
      paneKey: string
      worktreePath: string
      prompt: string
      agent: string
      startedAt: number
    }

type OpenTurn = { worktreePath: string; prompt: string; agent: string; startedAt: number }

export function createAgentTurnTracker(): {
  observe: (event: AgentTurnObservation) => AgentTurnAction[]
} {
  const open = new Map<string, OpenTurn>()
  const finished = new Map<string, OpenTurn>()
  const latestPrompts = new Map<string, string>()

  return {
    observe: (event) => {
      const { paneKey, worktreePath } = event
      if (event.state === 'done') {
        const turn = open.get(paneKey)
        if (!turn) {
          return []
        }
        open.delete(paneKey)
        finished.set(paneKey, turn)
        return [{ kind: 'end', paneKey, ...turn }]
      }
      if (event.state !== 'working' || event.turnStartedAt === undefined) {
        return []
      }
      const current = open.get(paneKey)
      if (current) {
        if (!current.prompt && event.prompt) {
          current.prompt = event.prompt
        }
        if (event.prompt) {
          latestPrompts.set(paneKey, event.prompt)
        }
        return []
      }
      // Why: harness wake-ups (a background agent finishing) fire a prompt hook but keep the
      // user's latest prompt, so that same prompt after a stop is the same turn carrying on.
      const last = finished.get(paneKey)
      if (
        last &&
        last.worktreePath === worktreePath &&
        (!event.prompt || event.prompt === latestPrompts.get(paneKey))
      ) {
        open.set(paneKey, last)
        return [{ kind: 'resume', paneKey, worktreePath }]
      }
      if (event.prompt) {
        latestPrompts.set(paneKey, event.prompt)
      }
      open.set(paneKey, {
        worktreePath,
        prompt: event.prompt ?? '',
        agent: event.agent,
        startedAt: event.turnStartedAt
      })
      return [{ kind: 'start', paneKey, worktreePath }]
    }
  }
}
