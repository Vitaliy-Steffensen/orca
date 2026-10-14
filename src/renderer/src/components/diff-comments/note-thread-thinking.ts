import type { DiffComment } from '../../../../shared/diff-comment-types'
import type { AgentStatusEntry } from '../../../../shared/agent-status-types'
import { formatAgentTypeLabel } from '../../../../shared/agent-type-label'

/**
 * Fork: who is working on an answer to a thread whose last message is a sent question, or null.
 * Without a recorded pane, any agent working in the workspace stands in for it.
 */
export function noteThreadThinkingAgent(
  thread: readonly DiffComment[],
  worktreeTabIds: readonly string[],
  statusByPaneKey: Readonly<Record<string, AgentStatusEntry | undefined>>
): string | null {
  const last = thread.at(-1)
  if (!last || last.agentAuthor || !last.sentAt) {
    return null
  }
  const paneKeys = last.sentToPaneKey
    ? [last.sentToPaneKey]
    : Object.keys(statusByPaneKey).filter((key) =>
        worktreeTabIds.some((tabId) => key.startsWith(`${tabId}:`))
      )
  const working = paneKeys
    .map((key) => statusByPaneKey[key])
    .find((entry) => entry?.state === 'working')
  return working ? formatAgentTypeLabel(working.agentType) : null
}
