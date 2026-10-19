import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { runtimeTargetForOwnerEnvironment } from '@/runtime/runtime-client-target'
import { getRuntimeEnvironmentIdForWorktree } from '@/lib/worktree-runtime-owner'
import {
  WORKSPACE_RUN_COMPOSE_FILENAMES,
  workspaceRunMentionsContainers
} from '../../../shared/workspace-run-container-runtime'
import type { WorkspaceRunQuickCommand } from '../../../shared/terminal-quick-command-types'

async function worktreeHasComposeFile(worktreePath: string): Promise<boolean> {
  const pathsExist = window.api.fs.pathsExist
  if (!pathsExist) {
    return false
  }
  const results = await pathsExist({
    filePaths: WORKSPACE_RUN_COMPOSE_FILENAMES.map((name) => `${worktreePath}/${name}`)
  }).catch(() => [])
  return results.some((result) => 'exists' in result && result.exists)
}

function runsOnThisMachine(worktreeId: string): boolean {
  const store = useAppStore.getState()
  const target = runtimeTargetForOwnerEnvironment(
    getRuntimeEnvironmentIdForWorktree(store, worktreeId)
  )
  if (target.kind !== 'local') {
    return false
  }
  const worktree = store.getKnownWorktreeById(worktreeId)
  const repo = store.repos.find((entry) => entry.id === worktree?.repoId)
  return !repo?.connectionId
}

/** Brings OrbStack up before a container-backed run, and reports whether the caller had to wait. */
export async function startContainerRuntimeForWorkspaceRun(args: {
  worktreeId: string
  worktreePath: string
  command: WorkspaceRunQuickCommand
  onStarting: () => void
}): Promise<void> {
  if (!runsOnThisMachine(args.worktreeId)) {
    return
  }
  const status = await window.api.containerRuntime.probe().catch(() => 'unavailable' as const)
  if (status !== 'stopped') {
    return
  }
  if (
    !workspaceRunMentionsContainers(args.command) &&
    !(await worktreeHasComposeFile(args.worktreePath))
  ) {
    return
  }
  args.onStarting()
  const result = await window.api.containerRuntime.start().catch(() => 'unavailable' as const)
  if (result === 'timed-out') {
    toast.warning(
      translate(
        'auto.lib.workspace.run.container.runtime.start.timedOut',
        'OrbStack is still starting — the run is going ahead anyway'
      )
    )
  }
}
