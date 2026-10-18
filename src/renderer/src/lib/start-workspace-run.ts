import { createBrowserUuid } from '@/lib/browser-uuid'
import { terminalPanePlacementRow } from '@/lib/terminal-pane-placement-row'
import { enqueueWorkspaceRun } from '@/lib/workspace-run-queue'
import {
  commitSpawnedBackgroundPane,
  spawnBackgroundTerminalPane
} from '@/lib/spawn-background-terminal-pane'
import { useAppStore } from '@/store'
import { singlePaneLayoutSnapshot } from '@/store/slices/terminal-helpers'
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import type { WorkspaceRunQuickCommand } from '../../../shared/terminal-quick-command-types'
import { DEFAULT_WORKSPACE_RUN_READY_TIMEOUT_SECONDS } from '../../../shared/workspace-run-quick-command'
import { stopWorkspaceRunNow } from '@/lib/stop-workspace-run'

async function launchWorkspaceRun(
  worktreeId: string,
  command: WorkspaceRunQuickCommand
): Promise<void> {
  const store = useAppStore.getState()
  if (store.workspaceRunByWorktreeId[worktreeId]) {
    return
  }
  const worktree =
    store.getKnownWorktreeById(worktreeId) ??
    store.allWorktrees().find((entry) => entry.id === worktreeId)
  if (!worktree) {
    throw new Error('The target workspace is no longer available.')
  }
  const connectionId = store.repos.find((repo) => repo.id === worktree.repoId)?.connectionId ?? null
  const groupId = store.activeGroupIdByWorktree[worktreeId]
  const started: { tabId: string; ptyId?: string }[] = []
  const services: {
    label: string
    tabId: string
    readyPort?: number
    ready: boolean
  }[] = []

  try {
    for (const [index, service] of command.services.entries()) {
      const label = service.label.trim() || `Service ${index + 1}`
      const tab = store.createTab(worktreeId, groupId, undefined, {
        activate: false,
        recordInteraction: false,
        workspaceRunServiceLabel: label
      })
      store.setTabCustomTitle(tab.id, label, { recordInteraction: false })
      const leafId = createBrowserUuid()
      store.setTabLayout(tab.id, singlePaneLayoutSnapshot(leafId))
      const created =
        useAppStore.getState().tabsByWorktree[worktreeId]?.find((entry) => entry.id === tab.id) ??
        tab
      const pane = await spawnBackgroundTerminalPane({
        worktree,
        connectionId,
        tabId: tab.id,
        leafId,
        placement: { kind: 'new-tab', row: terminalPanePlacementRow(created) },
        command: service.command,
        env: { ORCA_WORKSPACE_RUN_SERVICE: label }
      })
      started.push({ tabId: tab.id, ptyId: pane.ptyId })
      const attached = await commitSpawnedBackgroundPane({
        tabId: tab.id,
        leafId,
        pane,
        layout: singlePaneLayoutSnapshot(leafId, pane.ptyId)
      })
      if (!attached) {
        throw new Error('The terminal tab was closed before its session finished starting.')
      }
      services.push({
        label,
        tabId: tab.id,
        ...(service.readyPort !== undefined ? { readyPort: service.readyPort } : {}),
        ready: false
      })
    }
  } catch (error) {
    for (const launched of started) {
      if (launched.ptyId) {
        await window.api.pty.kill(launched.ptyId).catch(() => undefined)
      }
      useAppStore
        .getState()
        .closeTab(launched.tabId, { recordInteraction: false, reason: 'cleanup' })
    }
    throw error
  }

  const now = Date.now()
  const timeoutSeconds = command.readyTimeoutSeconds ?? DEFAULT_WORKSPACE_RUN_READY_TIMEOUT_SECONDS
  useAppStore.getState().setWorkspaceRun(worktreeId, {
    commandId: command.id,
    state: 'booting',
    startedAt: now,
    readyDeadlineAt: now + timeoutSeconds * 1000,
    services,
    openedBrowser: false
  })
}

export function startWorkspaceRun(args: {
  worktreeId: string
  command: WorkspaceRunQuickCommand
}): Promise<void> {
  return enqueueWorkspaceRun(args.worktreeId, async () => {
    try {
      await launchWorkspaceRun(args.worktreeId, args.command)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The run failed to start.'
      toast.error(translate('auto.lib.start.workspace.run.failed', "Run didn't start"), {
        description: message
      })
    }
  })
}

export function restartWorkspaceRun(args: {
  worktreeId: string
  command: WorkspaceRunQuickCommand
}): Promise<void> {
  return enqueueWorkspaceRun(args.worktreeId, async () => {
    await stopWorkspaceRunNow(args.worktreeId)
    await launchWorkspaceRun(args.worktreeId, args.command)
  })
}
