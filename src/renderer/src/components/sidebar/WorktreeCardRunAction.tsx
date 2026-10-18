import { Play, Square } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { startWorkspaceRun } from '@/lib/start-workspace-run'
import { stopWorkspaceRun } from '@/lib/stop-workspace-run'
import type { WorkspaceRunQuickCommand } from '../../../../shared/terminal-quick-command-types'

function stopCardPointer(event: React.SyntheticEvent): void {
  event.stopPropagation()
}

export function WorktreeCardRunAction({
  worktreeId,
  command,
  active
}: {
  worktreeId: string
  command: WorkspaceRunQuickCommand | null
  active: boolean
}): React.JSX.Element | null {
  if (!command && !active) {
    return null
  }
  const label = active
    ? translate('auto.components.sidebar.WorktreeCardRunAction.stop', 'Stop')
    : translate('auto.components.sidebar.WorktreeCardRunAction.run', 'Run')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {active ? (
          <button
            type="button"
            data-workspace-board-preserve-open=""
            aria-label={label}
            className="inline-flex size-4 items-center justify-center rounded text-primary opacity-100 hover:bg-accent"
            onPointerDown={stopCardPointer}
            onClick={(event) => {
              stopCardPointer(event)
              void stopWorkspaceRun(worktreeId)
            }}
          >
            <Square className="size-3 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            data-workspace-board-preserve-open=""
            aria-label={label}
            className="inline-flex size-4 items-center justify-center rounded text-muted-foreground opacity-0 hover:bg-accent hover:text-foreground group-hover/worktree-card:opacity-100 group-focus-within/worktree-card:opacity-100 focus-visible:opacity-100"
            onPointerDown={stopCardPointer}
            onClick={(event) => {
              stopCardPointer(event)
              if (command) {
                void startWorkspaceRun({ worktreeId, command })
              }
            }}
          >
            <Play className="size-3 fill-current" strokeWidth={0} />
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
