import {
  getTerminalQuickCommandScope,
  isTerminalAgentQuickCommand,
  isWorkspaceRunQuickCommand
} from '../../../../shared/terminal-quick-commands'
import type {
  TerminalQuickCommand,
  WorkspaceRunLoginConfig,
  WorkspaceRunService
} from '../../../../shared/terminal-quick-command-types'
import { DEFAULT_WORKSPACE_RUN_READY_TIMEOUT_SECONDS } from '../../../../shared/workspace-run-quick-command'
import type { TuiAgent } from '../../../../shared/tui-agent'

export type TerminalQuickCommandDialogAction = 'terminal-command' | 'agent-prompt' | 'workspace-run'

export type WorkspaceRunDialogMemory = {
  services: WorkspaceRunService[]
  readyTimeoutSeconds: number
  openBrowser: boolean
  browserServiceIndex?: number
  browserPath?: string
  autoLogin?: WorkspaceRunLoginConfig
}

export type TerminalQuickCommandDialogDraftMemory = {
  terminalCommand: string
  terminalAppendEnter: boolean
  agent: TuiAgent
  agentPrompt: string
  workspaceRun: WorkspaceRunDialogMemory
}

function emptyWorkspaceRunMemory(): WorkspaceRunDialogMemory {
  return {
    services: [{ label: '', command: '' }],
    readyTimeoutSeconds: DEFAULT_WORKSPACE_RUN_READY_TIMEOUT_SECONDS,
    openBrowser: false
  }
}

function workspaceRunMemoryFromCommand(
  command: Extract<TerminalQuickCommand, { action: 'workspace-run' }>
): WorkspaceRunDialogMemory {
  return {
    services:
      command.services.length > 0
        ? command.services.map((service) => ({ ...service }))
        : [{ label: '', command: '' }],
    readyTimeoutSeconds: command.readyTimeoutSeconds ?? DEFAULT_WORKSPACE_RUN_READY_TIMEOUT_SECONDS,
    openBrowser: command.openBrowser === true,
    ...(command.browserServiceIndex !== undefined
      ? { browserServiceIndex: command.browserServiceIndex }
      : {}),
    ...(command.browserPath ? { browserPath: command.browserPath } : {}),
    ...(command.autoLogin ? { autoLogin: { ...command.autoLogin } } : {})
  }
}

export function createTerminalQuickCommandDialogDraftMemory(
  command: TerminalQuickCommand,
  fallbackAgent: TuiAgent
): TerminalQuickCommandDialogDraftMemory {
  const workspaceRun = isWorkspaceRunQuickCommand(command)
    ? workspaceRunMemoryFromCommand(command)
    : emptyWorkspaceRunMemory()
  if (isTerminalAgentQuickCommand(command)) {
    return {
      terminalCommand: '',
      terminalAppendEnter: true,
      agent: command.agent,
      agentPrompt: command.prompt,
      workspaceRun
    }
  }
  if (isWorkspaceRunQuickCommand(command)) {
    return {
      terminalCommand: '',
      terminalAppendEnter: true,
      agent: fallbackAgent,
      agentPrompt: '',
      workspaceRun
    }
  }
  return {
    terminalCommand: command.command,
    terminalAppendEnter: command.appendEnter,
    agent: fallbackAgent,
    agentPrompt: '',
    workspaceRun
  }
}

export function rememberTerminalQuickCommandDialogDraft(
  memory: TerminalQuickCommandDialogDraftMemory,
  draft: TerminalQuickCommand
): TerminalQuickCommandDialogDraftMemory {
  if (isTerminalAgentQuickCommand(draft)) {
    return {
      ...memory,
      agent: draft.agent,
      agentPrompt: draft.prompt
    }
  }
  if (isWorkspaceRunQuickCommand(draft)) {
    return {
      ...memory,
      workspaceRun: workspaceRunMemoryFromCommand(draft)
    }
  }
  return {
    ...memory,
    terminalCommand: draft.command,
    terminalAppendEnter: draft.appendEnter
  }
}

function workspaceRunDraft(
  base: Pick<TerminalQuickCommand, 'id' | 'label' | 'scope'>,
  memory: WorkspaceRunDialogMemory
): TerminalQuickCommand {
  return {
    ...base,
    action: 'workspace-run',
    services: memory.services.map((service) => ({ ...service })),
    readyTimeoutSeconds: memory.readyTimeoutSeconds,
    openBrowser: memory.openBrowser,
    ...(memory.browserServiceIndex !== undefined
      ? { browserServiceIndex: memory.browserServiceIndex }
      : {}),
    ...(memory.browserPath ? { browserPath: memory.browserPath } : {}),
    ...(memory.autoLogin ? { autoLogin: { ...memory.autoLogin } } : {})
  }
}

export function switchTerminalQuickCommandDialogAction(
  draft: TerminalQuickCommand,
  action: TerminalQuickCommandDialogAction,
  memory: TerminalQuickCommandDialogDraftMemory
): {
  draft: TerminalQuickCommand
  memory: TerminalQuickCommandDialogDraftMemory
} {
  const nextMemory = rememberTerminalQuickCommandDialogDraft(memory, draft)
  const base = {
    id: draft.id,
    label: draft.label,
    scope: getTerminalQuickCommandScope(draft)
  }

  // Why: action modes are independent editors; toggling should not transform
  // terminal command text into an agent prompt, or the reverse.
  if (action === 'agent-prompt') {
    return {
      memory: nextMemory,
      draft: {
        ...base,
        action: 'agent-prompt',
        agent: nextMemory.agent,
        prompt: nextMemory.agentPrompt
      }
    }
  }

  if (action === 'workspace-run') {
    return {
      memory: nextMemory,
      draft: workspaceRunDraft(base, nextMemory.workspaceRun)
    }
  }

  return {
    memory: nextMemory,
    draft: {
      ...base,
      action: 'terminal-command',
      command: nextMemory.terminalCommand,
      appendEnter: nextMemory.terminalAppendEnter
    }
  }
}
