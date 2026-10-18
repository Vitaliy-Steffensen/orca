import { useAppStore } from '@/store'
import {
  openWorkspacePortInBrowser,
  shouldOpenWorkspacePortInOrcaBrowser
} from '@/lib/workspace-port-actions'
import { browserUrlForPort } from '@/lib/workspace-port-urls'
import { runtimeTargetForOwnerEnvironment } from '@/runtime/runtime-client-target'
import { getRuntimeEnvironmentIdForWorktree } from '@/lib/worktree-runtime-owner'
import type { WorkspacePort } from '../../../shared/workspace-ports'
import type { WorkspaceRunQuickCommand } from '../../../shared/terminal-quick-command-types'
import { runWorkspaceAutoLogin } from '@/lib/run-workspace-auto-login'

function portWithPath(port: WorkspacePort, browserPath: string | undefined): WorkspacePort {
  const suffix = browserPath?.trim()
  if (!suffix || port.kind !== 'workspace') {
    return port
  }
  const extra = suffix.startsWith('/') ? suffix : `/${suffix}`
  try {
    const url = new URL(browserUrlForPort(port))
    url.pathname = `${url.pathname.replace(/\/$/, '')}${extra}`.replace(/\/{2,}/g, '/')
    return { ...port, advertisedUrl: url.toString() }
  } catch {
    return port
  }
}

function portForCommand(
  command: WorkspaceRunQuickCommand,
  worktreeId: string
): WorkspacePort | null {
  const indexed =
    command.browserServiceIndex !== undefined
      ? command.services[command.browserServiceIndex]
      : undefined
  const service =
    indexed?.readyPort !== undefined
      ? indexed
      : command.services.find((candidate) => candidate.readyPort !== undefined)
  if (!service?.readyPort) {
    return null
  }
  const scans = useAppStore.getState().workspacePortScansByKey
  for (const scan of Object.values(scans)) {
    for (const port of scan.ports) {
      if (
        port.kind === 'workspace' &&
        port.owner.worktreeId === worktreeId &&
        port.port === service.readyPort
      ) {
        return port
      }
    }
  }
  return null
}

export async function openWorkspaceRunBrowser(args: {
  worktreeId: string
  command: WorkspaceRunQuickCommand
}): Promise<void> {
  const port = portForCommand(args.command, args.worktreeId)
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
    port: portWithPath(port, args.command.browserPath),
    activeWorktreeId: args.worktreeId,
    runtimeTarget,
    createBrowserTab: store.createBrowserTab,
    setRemoteBrowserPageHandle: store.setRemoteBrowserPageHandle,
    openInOrcaBrowser
  })
  if (!opened.ok || !args.command.autoLogin || runtimeTarget?.kind !== 'local') {
    return
  }
  const browserTabs = store.browserTabsByWorktree[args.worktreeId] ?? []
  const activeId = useAppStore.getState().activeBrowserTabIdByWorktree[args.worktreeId]
  const pageId = browserTabs.find((tab) => tab.id === activeId)?.activePageId
  if (!pageId) {
    return
  }
  await runWorkspaceAutoLogin({
    worktreeId: args.worktreeId,
    command: args.command,
    pageId
  })
}
