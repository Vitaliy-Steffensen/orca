import { retireUnownedTerminal } from '@/lib/retire-unowned-background-terminal'
import { registerBackgroundPaneBuffer } from '@/lib/background-pane-exit-output'
import { useAppStore } from '@/store'
import { makePaneKey } from '../../../shared/stable-pane-id'
import type { TerminalLayoutSnapshot } from '../../../shared/terminal-tab-types'
import type { TerminalPanePlacement } from '../../../shared/terminal-pane-placement'
import type { Worktree } from '../../../shared/worktree/types'

export type SpawnedBackgroundPane = { ptyId: string; incarnationId?: string }

function buildPaneEnv(
  worktreeId: string,
  tabId: string,
  leafId: string,
  env: Record<string, string> | undefined
): Record<string, string> {
  return {
    ...env,
    ORCA_PANE_KEY: makePaneKey(tabId, leafId),
    ORCA_TAB_ID: tabId,
    ORCA_WORKTREE_ID: worktreeId
  }
}

export async function spawnBackgroundTerminalPane(args: {
  worktree: Worktree
  connectionId: string | null
  tabId: string
  leafId: string
  /** Omitted for a pane that never becomes a tab, so main records no tab for it. */
  placement?: TerminalPanePlacement
  command?: string
  env?: Record<string, string>
}): Promise<SpawnedBackgroundPane> {
  const result = await window.api.pty.spawn({
    cols: 120,
    rows: 40,
    cwd: args.worktree.path,
    ...(args.command ? { command: args.command } : {}),
    env: buildPaneEnv(args.worktree.id, args.tabId, args.leafId, args.env),
    connectionId: args.connectionId,
    worktreeId: args.worktree.id,
    tabId: args.tabId,
    leafId: args.leafId,
    ...(args.placement ? { placement: args.placement } : {})
  })
  return {
    ptyId: result.id,
    ...(result.incarnationId ? { incarnationId: result.incarnationId } : {})
  }
}

/** False when the tab disappeared while the pty was starting, after the pty was retired. */
export async function commitSpawnedBackgroundPane(args: {
  tabId: string
  leafId: string
  pane: SpawnedBackgroundPane
  layout: TerminalLayoutSnapshot
}): Promise<boolean> {
  if (
    await retireUnownedTerminal({
      owner: { tabId: args.tabId },
      ptyId: args.pane.ptyId,
      runtimeTarget: { kind: 'local' }
    })
  ) {
    return false
  }
  const store = useAppStore.getState()
  store.updateTabPtyId(args.tabId, args.pane.ptyId)
  store.setTabLayout(args.tabId, args.layout)
  registerBackgroundPaneBuffer(args.tabId, args.leafId, args.pane)
  return true
}
