import {
  isTerminalQuickCommandComplete,
  isWorkspaceRunQuickCommand,
  terminalQuickCommandMatchesRepo
} from '../../../shared/terminal-quick-commands'
import type {
  TerminalQuickCommand,
  WorkspaceRunQuickCommand
} from '../../../shared/terminal-quick-command-types'
import type { AppState } from '@/store/types'

export function matchingWorkspaceRunCommands(
  commands: readonly TerminalQuickCommand[],
  repoId: string | null
): WorkspaceRunQuickCommand[] {
  const matches = commands.filter(
    (command): command is WorkspaceRunQuickCommand =>
      isWorkspaceRunQuickCommand(command) &&
      terminalQuickCommandMatchesRepo(command, repoId) &&
      isTerminalQuickCommandComplete(command)
  )
  const repoScoped = matches.filter((command) => command.scope?.type === 'repo')
  return repoScoped.length > 0 ? repoScoped : matches
}

export function workspaceRunCommandsForWorktree(
  state: Pick<AppState, 'settings' | 'runtimeTerminalQuickCommands'>,
  repoId: string | null
): WorkspaceRunQuickCommand[] {
  const lists: TerminalQuickCommand[][] = [state.settings?.terminalQuickCommands ?? []]
  for (const remote of state.runtimeTerminalQuickCommands.values()) {
    if (remote.supported && remote.commands.length > 0) {
      lists.push([...remote.commands])
    }
  }
  const seen = new Set<string>()
  const matches: WorkspaceRunQuickCommand[] = []
  for (const command of matchingWorkspaceRunCommands(lists.flat(), repoId)) {
    if (seen.has(command.id)) {
      continue
    }
    seen.add(command.id)
    matches.push(command)
  }
  return matches
}

export function findWorkspaceRunCommandById(
  state: Pick<AppState, 'settings' | 'runtimeTerminalQuickCommands'>,
  commandId: string
): WorkspaceRunQuickCommand | null {
  const lists = [state.settings?.terminalQuickCommands ?? []]
  for (const remote of state.runtimeTerminalQuickCommands.values()) {
    lists.push([...remote.commands])
  }
  for (const command of lists.flat()) {
    if (command.id === commandId && isWorkspaceRunQuickCommand(command)) {
      return command
    }
  }
  return null
}
