import { createBrowserUuid } from '@/lib/browser-uuid'
import { runtimeTargetForOwnerEnvironment } from '@/runtime/runtime-client-target'
import { getRuntimeEnvironmentIdForWorktree } from '@/lib/worktree-runtime-owner'
import { singlePaneLayoutSnapshot } from '@/store/slices/terminal-helpers'
import { terminalPanePlacementRow } from '@/lib/terminal-pane-placement-row'
import {
  commitSpawnedBackgroundPane,
  spawnBackgroundTerminalPane
} from '@/lib/spawn-background-terminal-pane'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import {
  buildSetupRunnerCommand,
  getSetupRunnerCommandPlatformForPath
} from '../../../shared/setup-runner-command'
import type {
  TerminalLayoutSnapshot,
  TerminalPaneLayoutNode
} from '../../../shared/terminal-tab-types'
import type {
  WorktreeDefaultTabsLaunch,
  WorktreeSetupLaunch
} from '../../../shared/worktree/launch-types'
import type { Worktree } from '../../../shared/worktree/types'

type BackgroundPane = {
  leafId: string
  ptyId: string
  incarnationId?: string
}

type BackgroundTab = {
  tabId: string
  primary: BackgroundPane
}

type BackgroundTerminalLaunch = {
  command?: string
  env?: Record<string, string>
  title?: string
  color?: string
}

function getSetupTabTitle(): string {
  return translate('auto.lib.launch.worktree.background.terminals.setupTitle', 'Setup')
}

export type LaunchWorktreeBackgroundTerminalsArgs = {
  worktreeId: string
  setup?: WorktreeSetupLaunch
  defaultTabs?: WorktreeDefaultTabsLaunch
}

function buildSplitRoot(
  firstLeafId: string,
  secondLeafId: string,
  direction: 'horizontal' | 'vertical'
): TerminalPaneLayoutNode {
  return {
    type: 'split',
    direction,
    first: { type: 'leaf', leafId: firstLeafId },
    second: { type: 'leaf', leafId: secondLeafId }
  }
}

function buildSplitLayout(
  first: BackgroundPane,
  second: BackgroundPane,
  direction: 'horizontal' | 'vertical',
  secondTitle: string
): TerminalLayoutSnapshot {
  return {
    root: buildSplitRoot(first.leafId, second.leafId, direction),
    activeLeafId: first.leafId,
    expandedLeafId: null,
    ptyIdsByLeafId: {
      [first.leafId]: first.ptyId,
      [second.leafId]: second.ptyId
    },
    titlesByLeafId: {
      [second.leafId]: secondTitle
    }
  }
}

function buildSetupCommand(setup: WorktreeSetupLaunch): string {
  // Why: background setup tabs can launch later, so they must reuse the same shell chosen when the runner was written.
  return buildSetupRunnerCommand(
    setup.runnerScriptPath,
    getSetupRunnerCommandPlatformForPath(setup.runnerScriptPath, 'posix'),
    setup.shell
  )
}

async function createBackgroundTab(args: {
  worktree: Worktree
  connectionId: string | null
  launch: BackgroundTerminalLaunch
}): Promise<BackgroundTab> {
  const store = useAppStore.getState()
  const tab = store.createTab(args.worktree.id, undefined, undefined, {
    activate: false,
    recordInteraction: false
  })
  if (args.launch.title) {
    store.setTabCustomTitle(tab.id, args.launch.title, { recordInteraction: false })
  }
  if (args.launch.color) {
    store.setTabColor(tab.id, args.launch.color)
  }

  const leafId = createBrowserUuid()
  store.setTabLayout(tab.id, singlePaneLayoutSnapshot(leafId))
  const created =
    useAppStore.getState().tabsByWorktree[args.worktree.id]?.find(({ id }) => id === tab.id) ?? tab
  let pane: Awaited<ReturnType<typeof spawnBackgroundTerminalPane>>
  try {
    pane = await spawnBackgroundTerminalPane({
      worktree: args.worktree,
      connectionId: args.connectionId,
      tabId: tab.id,
      leafId,
      placement: { kind: 'new-tab', row: terminalPanePlacementRow(created) },
      command: args.launch.command,
      env: args.launch.env
    })
  } catch (error) {
    store.closeTab(tab.id, { recordInteraction: false, reason: 'cleanup' })
    throw error
  }
  const attached = await commitSpawnedBackgroundPane({
    tabId: tab.id,
    leafId,
    pane,
    layout: singlePaneLayoutSnapshot(leafId, pane.ptyId)
  })
  if (!attached) {
    throw new Error('The terminal tab was closed before its session finished starting.')
  }
  return {
    tabId: tab.id,
    primary: { leafId, ptyId: pane.ptyId, incarnationId: pane.incarnationId }
  }
}

async function addSetupSplit(args: {
  worktree: Worktree
  connectionId: string | null
  tab: BackgroundTab
  setup: WorktreeSetupLaunch
  direction: 'horizontal' | 'vertical'
}): Promise<void> {
  const setupLeafId = createBrowserUuid()
  const setupPane = await spawnBackgroundTerminalPane({
    worktree: args.worktree,
    connectionId: args.connectionId,
    tabId: args.tab.tabId,
    leafId: setupLeafId,
    placement: {
      kind: 'split',
      parentLeafId: args.tab.primary.leafId,
      direction: args.direction,
      proposedRoot: buildSplitRoot(args.tab.primary.leafId, setupLeafId, args.direction)
    },
    command: buildSetupCommand(args.setup),
    env: args.setup.envVars
  })
  await commitSpawnedBackgroundPane({
    tabId: args.tab.tabId,
    leafId: setupLeafId,
    pane: setupPane,
    layout: buildSplitLayout(
      args.tab.primary,
      { leafId: setupLeafId, ptyId: setupPane.ptyId },
      args.direction,
      getSetupTabTitle()
    )
  })
}

function getDefaultTabLaunches(
  defaultTabs: WorktreeDefaultTabsLaunch | undefined
): BackgroundTerminalLaunch[] {
  return (defaultTabs?.tabs ?? []).map((tab) => {
    const command = tab.command?.trim()
    return {
      ...(tab.title ? { title: tab.title } : {}),
      ...(tab.color ? { color: tab.color } : {}),
      ...(command && defaultTabs?.runCommands ? { command } : {})
    }
  })
}

export async function launchWorktreeBackgroundTerminals(
  args: LaunchWorktreeBackgroundTerminalsArgs
): Promise<void> {
  if (!args.setup && !args.defaultTabs) {
    return
  }
  const store = useAppStore.getState()
  const runtimeTarget = runtimeTargetForOwnerEnvironment(
    getRuntimeEnvironmentIdForWorktree(store, args.worktreeId)
  )
  if (runtimeTarget.kind === 'environment') {
    // Runtime-owned worktrees materialize setup/defaultTabs inside createManagedWorktree.
    return
  }

  const worktree = store.allWorktrees().find((entry) => entry.id === args.worktreeId)
  if (!worktree) {
    throw new Error('The target workspace is no longer available.')
  }
  const repo = store.repos.find((entry) => entry.id === worktree.repoId)
  const connectionId = repo?.connectionId ?? null
  const defaultLaunches = getDefaultTabLaunches(args.defaultTabs)
  const launchedTabs: BackgroundTab[] = []

  for (const launch of defaultLaunches) {
    try {
      launchedTabs.push(await createBackgroundTab({ worktree, connectionId, launch }))
    } catch (error) {
      console.warn('[automations] Failed to launch workspace default tab:', error)
    }
  }

  const setupMode = store.settings?.setupScriptLaunchMode ?? 'new-tab'
  const shouldSplitSetup =
    args.setup && (setupMode === 'split-horizontal' || setupMode === 'split-vertical')
  if (shouldSplitSetup) {
    const primaryTab =
      launchedTabs[0] ?? (await createBackgroundTab({ worktree, connectionId, launch: {} }))
    await addSetupSplit({
      worktree,
      connectionId,
      tab: primaryTab,
      setup: args.setup!,
      direction: setupMode === 'split-horizontal' ? 'horizontal' : 'vertical'
    })
    return
  }

  if (args.setup) {
    if (launchedTabs.length === 0) {
      launchedTabs.push(await createBackgroundTab({ worktree, connectionId, launch: {} }))
    }
    await createBackgroundTab({
      worktree,
      connectionId,
      launch: {
        title: getSetupTabTitle(),
        command: buildSetupCommand(args.setup),
        env: args.setup.envVars
      }
    })
  }
}
