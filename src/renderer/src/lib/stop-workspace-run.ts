import { suppressWorkspaceRunAdoption } from '@/lib/workspace-run-adoption'
import { enqueueWorkspaceRun } from '@/lib/workspace-run-queue'
import { useAppStore } from '@/store'
import { canStopWorkspacePort, killWorkspacePortForTarget } from '@/lib/workspace-port-actions'
import { runtimeTargetForOwnerEnvironment } from '@/runtime/runtime-client-target'
import { getRuntimeEnvironmentIdForWorktree } from '@/lib/worktree-runtime-owner'
import { isWorkspaceRunQuickCommand } from '../../../shared/terminal-quick-commands'
import type { WorkspacePort } from '../../../shared/workspace-ports'

function listeningPorts(worktreeId: string): WorkspacePort[] {
  const scans = useAppStore.getState().workspacePortScansByKey
  const ports: WorkspacePort[] = []
  for (const scan of Object.values(scans)) {
    for (const port of scan.ports) {
      if (port.kind === 'workspace' && port.owner.worktreeId === worktreeId) {
        ports.push(port)
      }
    }
  }
  return ports
}

export async function stopWorkspaceRunNow(worktreeId: string): Promise<void> {
  const store = useAppStore.getState()
  const entry = store.workspaceRunByWorktreeId[worktreeId]
  suppressWorkspaceRunAdoption(worktreeId)
  store.clearWorkspaceRun(worktreeId)
  if (!entry) {
    return
  }

  if (entry.services.length === 0) {
    const commands = store.settings?.terminalQuickCommands ?? []
    const command = commands.find(
      (candidate) => candidate.id === entry.commandId && isWorkspaceRunQuickCommand(candidate)
    )
    const readyPorts = new Set(
      command && isWorkspaceRunQuickCommand(command)
        ? command.services.flatMap((service) =>
            service.readyPort !== undefined ? [service.readyPort] : []
          )
        : []
    )
    const target = runtimeTargetForOwnerEnvironment(
      getRuntimeEnvironmentIdForWorktree(store, worktreeId)
    )
    const worktree = store.getKnownWorktreeById(worktreeId)
    for (const port of listeningPorts(worktreeId)) {
      if (!readyPorts.has(port.port) || !canStopWorkspacePort(port) || !worktree) {
        continue
      }
      await killWorkspacePortForTarget(target, {
        repoId: worktree.repoId,
        pid: port.pid,
        port: port.port
      }).catch(() => undefined)
    }
    return
  }

  for (const service of entry.services) {
    for (const ptyId of useAppStore.getState().ptyIdsByTabId[service.tabId] ?? []) {
      await window.api.pty.kill(ptyId).catch(() => undefined)
    }
    useAppStore.getState().closeTab(service.tabId, { recordInteraction: false, reason: 'cleanup' })
  }
}

export function stopWorkspaceRun(worktreeId: string): Promise<void> {
  return enqueueWorkspaceRun(worktreeId, () => stopWorkspaceRunNow(worktreeId))
}
