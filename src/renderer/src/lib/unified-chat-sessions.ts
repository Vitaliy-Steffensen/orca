import {
  structuredLaunchIdentity,
  structuredLaunchStates,
  subscribeStructuredAgentLaunchStatus
} from '@/lib/structured-agent-session-launch-registry'
import type { UnifiedChatAgent } from '../../../shared/unified-claude-cursor-chat'

const unifiedSessions = new Set<string>()
const listeners = new Set<() => void>()
let lastAgent: UnifiedChatAgent | null = null

export function lastUnifiedChatAgent(): UnifiedChatAgent | null {
  return lastAgent
}

export function rememberUnifiedChatAgent(agent: UnifiedChatAgent): void {
  lastAgent = agent
}

export function isUnifiedChatSession(sessionId: string): boolean {
  return unifiedSessions.has(sessionId)
}

export function subscribeUnifiedChatSessions(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function unifiedLaunchSessionIds(worktreeId: string, agent: UnifiedChatAgent): Set<string> {
  const identity = structuredLaunchIdentity(worktreeId, agent)
  const ids = new Set<string>()
  for (const state of structuredLaunchStates()) {
    if (state.identity === identity) {
      ids.add(state.intent.sessionId)
    }
  }
  return ids
}

function markNewSessions(
  worktreeId: string,
  agent: UnifiedChatAgent,
  before: ReadonlySet<string>
): string | null {
  const identity = structuredLaunchIdentity(worktreeId, agent)
  let marked: string | null = null
  for (const state of structuredLaunchStates()) {
    if (state.identity !== identity || before.has(state.intent.sessionId)) {
      continue
    }
    if (!unifiedSessions.has(state.intent.sessionId)) {
      unifiedSessions.add(state.intent.sessionId)
      marked = state.intent.sessionId
    }
  }
  if (marked) {
    for (const listener of listeners) {
      listener()
    }
  }
  return marked
}

/** Marks the launch that appears after `before` was taken, including one the host admits later. */
export function noteUnifiedChatWhenStarted(
  worktreeId: string,
  agent: UnifiedChatAgent,
  before: ReadonlySet<string>,
  onSession: (sessionId: string) => void
): void {
  const existing = markNewSessions(worktreeId, agent, before)
  if (existing) {
    onSession(existing)
    return
  }
  const stop = subscribeStructuredAgentLaunchStatus(() => {
    const sessionId = markNewSessions(worktreeId, agent, before)
    if (!sessionId) {
      return
    }
    stop()
    onSession(sessionId)
  })
}

export function resetUnifiedChatSessionsForTests(): void {
  unifiedSessions.clear()
  listeners.clear()
  lastAgent = null
}
