import type { TuiAgent } from './tui-agent'

export type TerminalQuickCommandScope =
  | {
      type: 'global'
    }
  | {
      type: 'repo'
      repoId: string
    }

export type TerminalQuickCommandAction = 'terminal-command' | 'agent-prompt' | 'workspace-run'

export type WorkspaceRunService = {
  label: string
  command: string
  readyPort?: number
  /** Env name in the workspace's fnox.local.toml, used when readyPort is omitted. */
  readyPortEnv?: string
}

export type WorkspaceRunLoginConfig = {
  email: string
  emailSelector?: string
  passwordSelector?: string
  submitSelector?: string
  successSelector?: string
}

export type TerminalQuickCommandBase = {
  id: string
  label: string
  scope?: TerminalQuickCommandScope
}

export type TerminalCommandQuickCommand = TerminalQuickCommandBase & {
  action?: 'terminal-command'
  command: string
  appendEnter: boolean
}

export type TerminalAgentQuickCommand = TerminalQuickCommandBase & {
  action: 'agent-prompt'
  agent: TuiAgent
  prompt: string
}

export type WorkspaceRunQuickCommand = TerminalQuickCommandBase & {
  action: 'workspace-run'
  services: WorkspaceRunService[]
  readyTimeoutSeconds?: number
  openBrowser?: boolean
  browserServiceIndex?: number
  browserPath?: string
  autoLogin?: WorkspaceRunLoginConfig
}

export type TerminalQuickCommand =
  | TerminalCommandQuickCommand
  | TerminalAgentQuickCommand
  | WorkspaceRunQuickCommand
