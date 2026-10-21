import { useAppStore } from '@/store'
import {
  clearWorktreeSleepIntent,
  markWorktreeSleepIntent,
  withWorktreeSleepTeardown
} from '@/lib/worktree-sleep-intent'
import { translate } from '@/i18n/i18n'
import { preserveSidebarWorktreePosition } from './sidebar-worktree-row-position'
import { worktreeHostContext } from '@/lib/language-server-editor'
import { stopWorktreeLanguageServers as stopWorktreeServers } from '@/lib/language-server-client'

export type WorkspaceRuntimeTeardownOptions = {
  /**
   * Also release the work that survives a sleep: structured agent sessions and
   * the workspace's language servers. Archive sets this; sleep does not, because
   * a slept workspace is expected back in seconds.
   */
  stopBackgroundWork?: boolean
}

export type WorkspaceRuntimeTeardownResult = {
  succeededIds: string[]
  failedIds: string[]
  errors: string[]
}

export function describeWorkspaceTeardownFailure(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error)
  if (detail.includes('legacy')) {
    return translate(
      'auto.components.sidebar.sleep.worktree.flow.legacy.unverified',
      'The older host runtime could not confirm terminal shutdown. The workspace was kept open; update the host and try again.'
    )
  }
  if (
    detail.includes('terminal_') ||
    detail.includes('runtime') ||
    detail.includes('connection') ||
    detail.includes('Daemon')
  ) {
    return translate(
      'auto.components.sidebar.sleep.worktree.flow.host.unverified',
      'The host could not confirm terminal shutdown. The workspace was kept open; check the connection and try again.'
    )
  }
  return translate(
    'auto.components.sidebar.sleep.worktree.flow.retry',
    'The workspace was kept open. Try again; if the problem continues, check the host connection.'
  )
}

function closeStructuredAgentSessionTabs(worktreeId: string): void {
  const { unifiedTabsByWorktree, closeUnifiedTab } = useAppStore.getState()
  // Why separate from the PTY sweep: a structured session owns no PTY, no leaf
  // and no provider row, so shutdownWorktreeTerminals cannot see it.
  for (const tab of unifiedTabsByWorktree?.[worktreeId] ?? []) {
    if (tab.contentType === 'agent-session') {
      closeUnifiedTab?.(tab.id, { preserveWorktreeSelection: true, recordInteraction: false })
    }
  }
}

async function stopWorktreeLanguageServers(worktreeId: string): Promise<void> {
  // Why swallowed: a language server that never started is the common case, and
  // a stop that fails must not keep a workspace awake.
  try {
    const context = worktreeHostContext(useAppStore.getState(), worktreeId)
    if (context) {
      await stopWorktreeServers(context.target, context.worktreeRoot)
    }
  } catch (error) {
    console.error('[workspace-teardown] language server stop failed', { worktreeId, error })
  }
}

/**
 * Release everything a workspace is running, leaving the checkout and the tab
 * records untouched so it can come back.
 *
 * Why this is shared rather than inlined: the guard that clears
 * `activeWorktreeId` before tearing down terminals isn't optional polish —
 * shutting down the active worktree while its TerminalPane is still visible
 * causes a visible "reboot" flicker and can crash the pane (PTY exit callbacks
 * race against the live xterm instance). Centralizing the sequence here keeps
 * that safety invariant in one place so a new caller can't accidentally skip it.
 */
export async function tearDownWorkspaceRuntimes(
  worktreeIds: readonly string[],
  options: WorkspaceRuntimeTeardownOptions = {}
): Promise<WorkspaceRuntimeTeardownResult> {
  if (worktreeIds.length === 0) {
    return { succeededIds: [], failedIds: [], errors: [] }
  }
  const {
    activeWorktreeId,
    setActiveWorktree,
    shutdownWorktreeBrowsers,
    shutdownWorktreeTerminals
  } = useAppStore.getState()
  const sleptActiveWorktreeId =
    activeWorktreeId && worktreeIds.includes(activeWorktreeId) ? activeWorktreeId : null
  if (sleptActiveWorktreeId) {
    const restoreSidebarPosition = preserveSidebarWorktreePosition(sleptActiveWorktreeId)
    // Why: clearing the active workspace can unmount TerminalPanes before
    // shutdownWorktreeTerminals writes PTY suppressions; mark first so those
    // exits do not stamp activity. Kept off the store so it cannot disturb the
    // sidebar's scroll restoration.
    markWorktreeSleepIntent(sleptActiveWorktreeId)
    setActiveWorktree(null)
    restoreSidebarPosition()
  }
  const errors: string[] = []
  const failedWorktreeIds = new Set<string>()
  try {
    for (const worktreeId of worktreeIds) {
      // Why: the marker outlives teardown so the panes left mounted stay cold
      // until an explicit wake (#10205); mark per workspace so an earlier
      // slow teardown never leaves a later, still-awake one marked.
      markWorktreeSleepIntent(worktreeId)
      if (options.stopBackgroundWork) {
        closeStructuredAgentSessionTabs(worktreeId)
      }
      try {
        // Why: teardown mirrors removeWorktree's shutdown sequence — browsers first
        // so destroyPersistentWebview unregisters the Chromium guests before any
        // other teardown runs, terminals second so the PTY kill uses the same
        // ordering on both paths. Without the browser thunk here, sleep leaks
        // browserPagesByWorkspace entries and live webviews for the slept worktree.
        await withWorktreeSleepTeardown(worktreeId, () => shutdownWorktreeBrowsers(worktreeId))
      } catch (err) {
        console.error('[workspace-teardown] browser shutdown failed', { worktreeId, error: err })
        failedWorktreeIds.add(worktreeId)
        errors.push(describeWorkspaceTeardownFailure(err))
        continue
      }
      try {
        // Why: teardown is reversible — the tab record stays in tabsByWorktree, the
        // layout stays in terminalLayoutsByTabId, only the live PTY processes are
        // released. keepIdentifiers preserves tab.ptyId / ptyIdsByLeafId /
        // lastKnownRelayPtyIdByTabId so wake re-spawns against the same on-disk
        // history dir (local) or relay session id (SSH); it also captures
        // serializer buffers into buffersByLeafId for SSH wake to reseed
        // scrollback. See DESIGN_DOC_TERMINAL_HISTORY_FIX_V2.md §3.3.c.
        await withWorktreeSleepTeardown(worktreeId, async () => {
          await shutdownWorktreeTerminals(worktreeId, { keepIdentifiers: true })
          if (options.stopBackgroundWork) {
            await stopWorktreeLanguageServers(worktreeId)
          }
          if (typeof window !== 'undefined' && window.api?.ephemeralVm?.suspendWorkspace) {
            await window.api.ephemeralVm.suspendWorkspace({ workspaceId: worktreeId })
          }
        })
        // Why: a workspace the user activated during the batch is awake by their choice.
        if (useAppStore.getState().activeWorktreeId === worktreeId) {
          clearWorktreeSleepIntent(worktreeId)
        }
      } catch (err) {
        console.error('[workspace-teardown] terminal or host suspension failed', {
          worktreeId,
          error: err
        })
        failedWorktreeIds.add(worktreeId)
        errors.push(describeWorkspaceTeardownFailure(err))
      }
    }
  } finally {
    // Why: a failed teardown leaves the workspace awake and retryable.
    for (const worktreeId of failedWorktreeIds) {
      clearWorktreeSleepIntent(worktreeId)
    }
    if (sleptActiveWorktreeId && failedWorktreeIds.has(sleptActiveWorktreeId)) {
      setActiveWorktree(sleptActiveWorktreeId)
    }
  }
  return {
    succeededIds: worktreeIds.filter((worktreeId) => !failedWorktreeIds.has(worktreeId)),
    failedIds: [...failedWorktreeIds],
    errors
  }
}
