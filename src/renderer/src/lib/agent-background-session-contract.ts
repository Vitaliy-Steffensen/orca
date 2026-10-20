import type { ParsedAgentStatusPayload } from '../../../shared/agent-status-types'
import type { LaunchSource } from '../../../shared/telemetry-events'
import type { TuiAgent } from '../../../shared/tui-agent'
import type { SessionOptionValue } from '../../../shared/native-chat-session-options'
import type { AgentStartupPlan } from '@/lib/tui-agent-startup'
import type { AutomationTerminalOwnership } from '@/lib/automation-terminal-ownership'

export type LaunchAgentBackgroundSessionArgs = {
  agent: TuiAgent
  worktreeId: string
  prompt?: string
  /** An automation's saved extras, merged over this host's default Arguments. */
  extraAgentArgs?: string
  /** Model and effort for this launch, resolved to the agent's own flags. */
  sessionOptions?: Record<string, SessionOptionValue>
  launchSource?: LaunchSource
  title?: string
  onData?: (chunk: string) => void
  onExit?: (ptyId: string, code: number) => void
  onAgentStatus?: (payload: ParsedAgentStatusPayload) => void
}

export type LaunchAgentBackgroundSessionResult = {
  tabId: string
  paneKey: string
  ptyId: string
  startupPlan: AgentStartupPlan
  terminalOwnership: AutomationTerminalOwnership | null
}
