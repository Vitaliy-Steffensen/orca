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
import type {
  WorkspaceRunQuickCommand,
  WorkspaceRunService
} from '../../../shared/terminal-quick-command-types'
import { readWorkspaceRunReadyPortFromToml } from '../../../shared/workspace-run-ready-port'
import { DEFAULT_WORKSPACE_RUN_READY_TIMEOUT_SECONDS } from '../../../shared/workspace-run-quick-command'
import { stopWorkspaceRunNow } from '@/lib/stop-workspace-run'
import { startContainerRuntimeForWorkspaceRun } from '@/lib/workspace-run-container-runtime-start'
import type { WorkspaceRunServiceState } from '@/lib/workspace-run-transition'
import {
  WORKSPACE_RUN_SPLIT_DIRECTION,
  workspaceRunSplitLayout,
  workspaceRunSplitRoot,
  type WorkspaceRunPane
} from '@/lib/workspace-run-split-layout'

function decodeBase64(value: string): string {
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function readyPortForService(
  worktreePath: string,
  service: WorkspaceRunService
): Promise<number | undefined> {
  if (service.readyPort !== undefined) {
    return service.readyPort
  }
  if (!service.readyPortEnv) {
    return undefined
  }
  try {
    const chunk = await window.api.fs.readFileChunk({
      filePath: `${worktreePath}/fnox.local.toml`,
      offset: 0,
      length: 16_384
    })
    return readWorkspaceRunReadyPortFromToml(
      decodeBase64(chunk.contentBase64),
      service.readyPortEnv
    )
  } catch {
    return undefined
  }
}

async function launchWorkspaceRun(
  worktreeId: string,
  command: WorkspaceRunQuickCommand
): Promise<void> {
  const store = useAppStore.getState()
  const worktree =
    store.getKnownWorktreeById(worktreeId) ??
    store.allWorktrees().find((entry) => entry.id === worktreeId)
  if (!worktree) {
    throw new Error('The target workspace is no longer available.')
  }
  if (command.services.length === 0) {
    throw new Error('This run has no services configured.')
  }
  const connectionId = store.repos.find((repo) => repo.id === worktree.repoId)?.connectionId ?? null
  const groupId = store.activeGroupIdByWorktree[worktreeId]
  const tabTitle = command.label.trim() || translate('auto.lib.start.workspace.run.tabTitle', 'Run')
  const tab = store.createTab(worktreeId, groupId, undefined, {
    activate: false,
    recordInteraction: false,
    workspaceRunServiceLabel: tabTitle
  })
  store.setTabCustomTitle(tab.id, tabTitle, { recordInteraction: false })
  const firstLeafId = createBrowserUuid()
  store.setTabLayout(tab.id, singlePaneLayoutSnapshot(firstLeafId))
  const created =
    useAppStore.getState().tabsByWorktree[worktreeId]?.find((entry) => entry.id === tab.id) ?? tab
  const panes: WorkspaceRunPane[] = []
  const services: WorkspaceRunServiceState[] = []

  try {
    for (const [index, service] of command.services.entries()) {
      const label = service.label.trim() || `Service ${index + 1}`
      const leafId = index === 0 ? firstLeafId : createBrowserUuid()
      const previousLeafId = panes.at(-1)?.leafId
      const pane = await spawnBackgroundTerminalPane({
        worktree,
        connectionId,
        tabId: tab.id,
        leafId,
        placement:
          previousLeafId === undefined
            ? { kind: 'new-tab', row: terminalPanePlacementRow(created) }
            : {
                kind: 'split',
                parentLeafId: previousLeafId,
                direction: WORKSPACE_RUN_SPLIT_DIRECTION,
                proposedRoot: workspaceRunSplitRoot([...panes.map((entry) => entry.leafId), leafId])
              },
        command: service.command,
        env: { ORCA_WORKSPACE_RUN_SERVICE: label }
      })
      panes.push({ leafId, ptyId: pane.ptyId, label })
      const attached = await commitSpawnedBackgroundPane({
        tabId: tab.id,
        leafId,
        pane,
        layout:
          panes.length === 1
            ? singlePaneLayoutSnapshot(leafId, pane.ptyId)
            : workspaceRunSplitLayout(panes)
      })
      if (!attached) {
        throw new Error('The terminal tab was closed before its session finished starting.')
      }
      const readyPort = await readyPortForService(worktree.path, service)
      services.push({
        label,
        tabId: tab.id,
        leafId,
        ...(readyPort !== undefined ? { readyPort } : {}),
        ready: false
      })
    }
  } catch (error) {
    for (const pane of panes) {
      await window.api.pty.kill(pane.ptyId).catch(() => undefined)
    }
    useAppStore.getState().closeTab(tab.id, { recordInteraction: false, reason: 'cleanup' })
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

async function runWithContainerRuntime(
  worktreeId: string,
  command: WorkspaceRunQuickCommand
): Promise<void> {
  const store = useAppStore.getState()
  const worktree = store.getKnownWorktreeById(worktreeId)
  if (worktree) {
    await startContainerRuntimeForWorkspaceRun({
      worktreeId,
      worktreePath: worktree.path,
      command,
      onStarting: () => {
        const now = Date.now()
        useAppStore.getState().setWorkspaceRun(worktreeId, {
          commandId: command.id,
          state: 'starting-runtime',
          startedAt: now,
          readyDeadlineAt: now,
          services: [],
          openedBrowser: false
        })
      }
    })
  }
  await launchWorkspaceRun(worktreeId, command)
}

export function startWorkspaceRun(args: {
  worktreeId: string
  command: WorkspaceRunQuickCommand
}): Promise<void> {
  return enqueueWorkspaceRun(args.worktreeId, async () => {
    if (useAppStore.getState().workspaceRunByWorktreeId[args.worktreeId]) {
      return
    }
    try {
      await runWithContainerRuntime(args.worktreeId, args.command)
    } catch (error) {
      useAppStore.getState().clearWorkspaceRun(args.worktreeId)
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
    await runWithContainerRuntime(args.worktreeId, args.command)
  })
}
