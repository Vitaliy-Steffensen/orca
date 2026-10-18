import { Play, Square } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { workspaceRunCommandsForWorktree } from '@/lib/workspace-run-command'
import { startWorkspaceRun } from '@/lib/start-workspace-run'
import { stopWorkspaceRun } from '@/lib/stop-workspace-run'

export function WorktreeContextMenuRunItem({
  worktreeId,
  repoId,
  disabled
}: {
  worktreeId: string
  repoId: string
  disabled: boolean
}): React.JSX.Element | null {
  const entry = useAppStore((state) => state.workspaceRunByWorktreeId[worktreeId] ?? null)
  const command = useAppStore((state) => workspaceRunCommandsForWorktree(state, repoId)[0] ?? null)
  if (!command && !entry) {
    return null
  }
  const active = entry !== null
  return (
    <DropdownMenuItem
      disabled={disabled || (!active && !command)}
      onSelect={() => {
        if (active) {
          void stopWorkspaceRun(worktreeId)
          return
        }
        if (command) {
          void startWorkspaceRun({ worktreeId, command })
        }
      }}
    >
      {active ? (
        <Square className="size-3.5 fill-current" />
      ) : (
        <Play className="size-3.5 fill-current" strokeWidth={0} />
      )}
      {active
        ? translate('auto.components.sidebar.WorktreeContextMenuRunItem.stop', 'Stop run')
        : translate('auto.components.sidebar.WorktreeContextMenuRunItem.run', 'Run')}
    </DropdownMenuItem>
  )
}
