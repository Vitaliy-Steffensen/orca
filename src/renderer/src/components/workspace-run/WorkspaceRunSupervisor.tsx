import { useEffect } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import {
  nextWorkspaceRunWakeMs,
  transitionWorkspaceRun,
  type WorkspaceRunEntry,
  type WorkspaceRunServiceObservation
} from '@/lib/workspace-run-transition'
import {
  findWorkspaceRunCommandById,
  workspaceRunCommandsForWorktree
} from '@/lib/workspace-run-command'
import {
  openWorkspaceRunBrowser,
  workspaceRunBrowserOpenPlan
} from '@/lib/open-workspace-run-browser'
import { listeningPortNumbers } from '@/lib/workspace-run-ports'
import { workspaceRunAdoptionBlocked } from '@/lib/workspace-run-adoption'
import type { WorkspaceRunQuickCommand } from '../../../../shared/terminal-quick-command-types'

const ptyAliveSinceByTabId = new Map<string, number>()

function portsForWorktree(worktreeId: string): Set<number> {
  const ports = new Set<number>()
  for (const scan of Object.values(useAppStore.getState().workspacePortScansByKey)) {
    for (const port of scan.ports) {
      if (port.kind === 'workspace' && port.owner.worktreeId === worktreeId) {
        ports.add(port.port)
      }
    }
  }
  return ports
}

function observeServices(
  worktreeId: string,
  entry: WorkspaceRunEntry
): WorkspaceRunServiceObservation[] {
  const state = useAppStore.getState()
  const present = new Set((state.tabsByWorktree[worktreeId] ?? []).map((tab) => tab.id))
  // Why: a service published by Docker/OrbStack listens as the container
  // runtime, not as a process whose cwd is the worktree, so a workspace-only
  // match never sees it and the browser stays closed after boot.
  const ports = listeningPortNumbers(state.workspacePortScansByKey)
  return entry.services.map((service) => {
    const ptyIds = state.ptyIdsByTabId[service.tabId] ?? []
    const ptyAlive = ptyIds.length > 0
    if (ptyAlive) {
      if (!ptyAliveSinceByTabId.has(service.tabId)) {
        ptyAliveSinceByTabId.set(service.tabId, Date.now())
      }
    } else {
      ptyAliveSinceByTabId.delete(service.tabId)
    }
    return {
      tabId: service.tabId,
      tabPresent: present.has(service.tabId),
      ptyAlive,
      ptyAliveSince: ptyAliveSinceByTabId.get(service.tabId) ?? null,
      portListening: service.readyPort !== undefined && ports.has(service.readyPort)
    }
  })
}

function adoptEntry(worktreeId: string, now: number): WorkspaceRunEntry | null {
  if (workspaceRunAdoptionBlocked(worktreeId)) {
    return null
  }
  const state = useAppStore.getState()
  const worktree = state.getKnownWorktreeById(worktreeId)
  if (!worktree) {
    return null
  }
  const ports = portsForWorktree(worktreeId)
  const command = workspaceRunCommandsForWorktree(state, worktree.repoId).find((candidate) =>
    candidate.services.every(
      (service) => service.readyPort !== undefined && ports.has(service.readyPort)
    )
  )
  if (!command || command.services.length === 0) {
    return null
  }
  return {
    commandId: command.id,
    state: 'running',
    startedAt: now,
    readyDeadlineAt: now,
    services: [],
    openedBrowser: true
  }
}

function explain(toastKind: 'exited-before-up' | 'timed-out', entry: WorkspaceRunEntry): void {
  if (toastKind === 'exited-before-up') {
    toast.error(
      translate(
        'auto.components.workspace.run.WorkspaceRunSupervisor.exited',
        'Run exited before it came up'
      )
    )
    return
  }
  const seconds = Math.max(1, Math.round((entry.readyDeadlineAt - entry.startedAt) / 1000))
  const label = seconds % 60 === 0 ? `${seconds / 60}m` : `${seconds}s`
  toast.error(
    translate(
      'auto.components.workspace.run.WorkspaceRunSupervisor.timedOut',
      "Run didn't come up in {{duration}} — terminals are still open",
      { duration: label }
    )
  )
}

function reconcileWorkspaceRuns(): number | null {
  const state = useAppStore.getState()
  const now = Date.now()
  let wakeIn: number | null = null
  const worktreeIds = new Set<string>(Object.keys(state.workspaceRunByWorktreeId))
  for (const scan of Object.values(state.workspacePortScansByKey)) {
    for (const port of scan.ports) {
      if (port.kind === 'workspace') {
        worktreeIds.add(port.owner.worktreeId)
      }
    }
  }

  for (const worktreeId of worktreeIds) {
    const current = useAppStore.getState().workspaceRunByWorktreeId[worktreeId]
    if (current && current.services.length === 0) {
      const command = findWorkspaceRunCommandById(useAppStore.getState(), current.commandId)
      const ports = portsForWorktree(worktreeId)
      const stillUp =
        !command ||
        (command.services.length > 0 &&
          command.services.every(
            (service) => service.readyPort !== undefined && ports.has(service.readyPort)
          ))
      if (!stillUp) {
        useAppStore.getState().clearWorkspaceRun(worktreeId)
      }
      continue
    }
    if (!current) {
      const adopted = adoptEntry(worktreeId, now)
      if (adopted) {
        useAppStore.getState().setWorkspaceRun(worktreeId, adopted)
      }
      continue
    }
    const observations = observeServices(worktreeId, current)
    const result = transitionWorkspaceRun({ entry: current, now, observations })
    if (result.toast) {
      explain(result.toast, current)
    }
    if (result.entry === null) {
      useAppStore.getState().clearWorkspaceRun(worktreeId)
      continue
    }
    if (result.entry !== current) {
      useAppStore.getState().setWorkspaceRun(worktreeId, result.entry)
    }
    if (result.shouldOpenBrowser && result.entry) {
      const command = findWorkspaceRunCommandById(useAppStore.getState(), result.entry.commandId)
      const plan = workspaceRunBrowserOpenPlan({
        command,
        services: result.entry.services,
        worktreeId,
        scans: useAppStore.getState().workspacePortScansByKey
      })
      if (plan.markOpened) {
        useAppStore.getState().setWorkspaceRun(worktreeId, {
          ...result.entry,
          openedBrowser: true
        })
      }
      if (command && plan.port) {
        void openWorkspaceRunBrowser({
          worktreeId,
          command,
          services: result.entry.services,
          port: plan.port
        })
      }
    }
    const delay = nextWorkspaceRunWakeMs({ entry: result.entry, now, observations })
    if (delay !== null) {
      wakeIn = wakeIn === null ? delay : Math.min(wakeIn, delay)
    }
  }
  return wakeIn
}

export function WorkspaceRunSupervisor(): null {
  const ptyIdsByTabId = useAppStore((state) => state.ptyIdsByTabId)
  const scans = useAppStore((state) => state.workspacePortScansByKey)
  const tabsByWorktree = useAppStore((state) => state.tabsByWorktree)
  const runs = useAppStore((state) => state.workspaceRunByWorktreeId)
  const commands = useAppStore((state) => state.settings?.terminalQuickCommands)

  useEffect(() => {
    let timer: number | null = null
    const tick = (): void => {
      const wakeIn = reconcileWorkspaceRuns()
      if (wakeIn === null) {
        return
      }
      timer = window.setTimeout(tick, Math.max(wakeIn, 50))
    }
    tick()
    return () => {
      if (timer !== null) {
        window.clearTimeout(timer)
      }
    }
  }, [ptyIdsByTabId, scans, tabsByWorktree, runs, commands])

  return null
}

export function workspaceRunCommandForCard(
  worktreeId: string,
  repoId: string
): WorkspaceRunQuickCommand | null {
  return (
    workspaceRunCommandsForWorktree(useAppStore.getState(), repoId).find((command) => {
      const entry = useAppStore.getState().workspaceRunByWorktreeId[worktreeId]
      return !entry || entry.commandId === command.id
    }) ?? null
  )
}
