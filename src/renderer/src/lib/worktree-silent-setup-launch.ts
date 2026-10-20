import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { createBrowserUuid } from '@/lib/browser-uuid'
import {
  registerEagerPtyBuffer,
  type EagerPtyHandle
} from '@/components/terminal-pane/pty-dispatcher'
import { spawnBackgroundTerminalPane } from '@/lib/spawn-background-terminal-pane'
import { activateAndRevealWorktree } from '@/lib/worktree-activation'
import { singlePaneLayoutSnapshot } from '@/store/slices/terminal-helpers'
import {
  getSetupRunnerCommandPlatformForPath,
  resolveSetupRunnerCommand
} from '../../../shared/setup-runner-command'
import type { WorktreeSetupLaunch } from '../../../shared/worktree/launch-types'

// Why: the PTY stays ownerless so no tab ever enters the strip; a tab exists only to show a failure.
function showFailedSetupTab(worktreeId: string, leafId: string, output: string): void {
  const store = useAppStore.getState()
  const tab = store.createTab(worktreeId, undefined, undefined, {
    activate: false,
    recordInteraction: false
  })
  store.setTabCustomTitle(tab.id, 'Setup', { recordInteraction: false })
  store.setTabLayout(tab.id, {
    ...singlePaneLayoutSnapshot(leafId),
    ...(output.trim() ? { buffersByLeafId: { [leafId]: output } } : {})
  })
  toast.error(translate('auto.lib.worktree.silent.setup.failed', 'Setup script failed'), {
    action: {
      label: translate('auto.lib.worktree.silent.setup.viewOutput', 'View output'),
      onClick: () => {
        activateAndRevealWorktree(worktreeId)
        useAppStore.getState().setActiveTab(tab.id)
      }
    }
  })
}

/** Whether the runner's exit status can be made to end the PTY; native Windows shells can't take `; exit $?`. */
export function canRunSetupSilently(setup: WorktreeSetupLaunch): boolean {
  if (setup.command) {
    return false
  }
  const platform = getSetupRunnerCommandPlatformForPath(
    setup.runnerScriptPath,
    navigator.userAgent.includes('Windows') ? 'windows' : 'posix'
  )
  return resolveSetupRunnerCommand(setup.runnerScriptPath, platform, setup.shell).shell === 'posix'
}

async function spawnSilentSetup(worktreeId: string, setup: WorktreeSetupLaunch): Promise<void> {
  const store = useAppStore.getState()
  const worktree = store.allWorktrees().find((entry) => entry.id === worktreeId)
  if (!worktree) {
    throw new Error('The target workspace is no longer available.')
  }
  const platform = getSetupRunnerCommandPlatformForPath(setup.runnerScriptPath, 'posix')
  const { command } = resolveSetupRunnerCommand(setup.runnerScriptPath, platform, setup.shell)
  const leafId = createBrowserUuid()
  const pane = await spawnBackgroundTerminalPane({
    worktree,
    connectionId: store.repos.find((repo) => repo.id === worktree.repoId)?.connectionId ?? null,
    tabId: createBrowserUuid(),
    leafId,
    command: `${command}; exit $?`,
    env: setup.envVars
  })
  let buffer: EagerPtyHandle | null = null
  buffer = registerEagerPtyBuffer(
    pane.ptyId,
    (_ptyId, code) => {
      const output = buffer?.flush() ?? ''
      if (code !== 0) {
        showFailedSetupTab(worktreeId, leafId, output)
      }
    },
    pane.incarnationId
  )
}

/** Runs setup with no tab; `onUnavailable` falls back to the visible-tab launch if the spawn fails. */
export function launchSilentSetup(
  worktreeId: string,
  setup: WorktreeSetupLaunch,
  onUnavailable: () => void
): void {
  spawnSilentSetup(worktreeId, setup).catch((error) => {
    console.warn('worktree create: silent setup launch failed, opening a Setup tab', error)
    onUnavailable()
  })
}
