import { useAppStore } from '@/store'
import {
  openWorkspacePortInBrowser,
  shouldOpenWorkspacePortInOrcaBrowser
} from '@/lib/workspace-port-actions'
import { browserUrlForPort } from '@/lib/workspace-port-urls'
import { runtimeTargetForOwnerEnvironment } from '@/runtime/runtime-client-target'
import { getRuntimeEnvironmentIdForWorktree } from '@/lib/worktree-runtime-owner'
import type { WorkspacePort, WorkspacePortScanResult } from '../../../shared/workspace-ports'
import type { WorkspaceRunQuickCommand } from '../../../shared/terminal-quick-command-types'
import { runWorkspaceAutoLogin } from '@/lib/run-workspace-auto-login'

type ResolvedRunService = {
  readyPort?: number
}

export function resolveWorkspaceRunBrowserPort(
  command: WorkspaceRunQuickCommand,
  services: readonly ResolvedRunService[]
): number | undefined {
  const index = command.browserServiceIndex
  if (index !== undefined) {
    return services[index]?.readyPort ?? command.services[index]?.readyPort
  }
  return (
    services.find((service) => service.readyPort !== undefined)?.readyPort ??
    command.services.find((service) => service.readyPort !== undefined)?.readyPort
  )
}

export function findWorkspaceRunBrowserPort(args: {
  command: WorkspaceRunQuickCommand
  services: readonly ResolvedRunService[]
  worktreeId: string
  scans: Record<string, Pick<WorkspacePortScanResult, 'ports'> | undefined>
}): WorkspacePort | null {
  const readyPort = resolveWorkspaceRunBrowserPort(args.command, args.services)
  if (readyPort === undefined) {
    return null
  }
  let fallback: WorkspacePort | null = null
  for (const scan of Object.values(args.scans)) {
    if (!scan) {
      continue
    }
    for (const port of scan.ports) {
      if (port.port !== readyPort) {
        continue
      }
      if (port.kind === 'workspace' && port.owner.worktreeId === args.worktreeId) {
        return port
      }
      fallback ??= port
    }
  }
  return fallback
}

export function workspaceRunBrowserOpenPlan(args: {
  command: WorkspaceRunQuickCommand | null
  services: readonly ResolvedRunService[]
  worktreeId: string
  scans: Record<string, Pick<WorkspacePortScanResult, 'ports'> | undefined>
}): { markOpened: boolean; port: WorkspacePort | null } {
  if (!args.command?.openBrowser) {
    return { markOpened: true, port: null }
  }
  const port = findWorkspaceRunBrowserPort({ ...args, command: args.command })
  return { markOpened: port !== null, port }
}

export function workspaceRunLoginPageId(
  tabs: readonly { id: string; activePageId?: string | null }[],
  activeTabId: string | undefined
): string | null {
  if (!activeTabId) {
    return null
  }
  return tabs.find((tab) => tab.id === activeTabId)?.activePageId ?? null
}

function portWithPath(
  port: WorkspacePort,
  browserPath: string | undefined,
  worktreeId: string
): WorkspacePort {
  const suffix = browserPath?.trim()
  if (!suffix) {
    return port
  }
  const extra = suffix.startsWith('/') ? suffix : `/${suffix}`
  try {
    const url = new URL(browserUrlForPort(port))
    url.pathname = `${url.pathname.replace(/\/$/, '')}${extra}`.replace(/\/{2,}/g, '/')
    const advertisedUrl = url.toString()
    if (port.kind === 'workspace') {
      return { ...port, advertisedUrl }
    }
    return {
      ...port,
      protocol: url.protocol === 'https:' ? 'https' : 'http',
      kind: 'workspace',
      owner: {
        worktreeId,
        repoId: '',
        displayName: '',
        path: '',
        confidence: 'none'
      },
      advertisedUrl
    }
  } catch {
    return port
  }
}

export async function openWorkspaceRunBrowser(args: {
  worktreeId: string
  command: WorkspaceRunQuickCommand
  services?: readonly ResolvedRunService[]
  port?: WorkspacePort | null
}): Promise<void> {
  const port =
    args.port ??
    findWorkspaceRunBrowserPort({
      command: args.command,
      services: args.services ?? [],
      worktreeId: args.worktreeId,
      scans: useAppStore.getState().workspacePortScansByKey
    })
  if (!port) {
    return
  }
  const store = useAppStore.getState()
  const runtimeTarget = runtimeTargetForOwnerEnvironment(
    getRuntimeEnvironmentIdForWorktree(store, args.worktreeId)
  )
  const openInOrcaBrowser = args.command.autoLogin
    ? true
    : shouldOpenWorkspacePortInOrcaBrowser(store.settings)
  const opened = await openWorkspacePortInBrowser({
    port: portWithPath(port, args.command.browserPath, args.worktreeId),
    activeWorktreeId: args.worktreeId,
    runtimeTarget,
    createBrowserTab: store.createBrowserTab,
    setRemoteBrowserPageHandle: store.setRemoteBrowserPageHandle,
    openInOrcaBrowser
  })
  if (!opened.ok || !args.command.autoLogin || runtimeTarget?.kind !== 'local') {
    return
  }
  const latest = useAppStore.getState()
  const pageId = workspaceRunLoginPageId(
    latest.browserTabsByWorktree[args.worktreeId] ?? [],
    latest.activeBrowserTabIdByWorktree[args.worktreeId] ?? undefined
  )
  if (!pageId) {
    return
  }
  await runWorkspaceAutoLogin({
    worktreeId: args.worktreeId,
    command: args.command,
    pageId
  })
}
