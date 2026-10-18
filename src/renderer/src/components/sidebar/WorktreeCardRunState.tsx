import { Loader2, Play } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { WorkspaceRunState } from '@/lib/workspace-run-transition'

function runStateLabel(state: WorkspaceRunState): string {
  if (state === 'starting-runtime') {
    return translate(
      'auto.components.sidebar.WorktreeCardRunState.startingRuntime',
      'Starting OrbStack…'
    )
  }
  if (state === 'booting') {
    return translate('auto.components.sidebar.WorktreeCardRunState.booting', 'Spinning up…')
  }
  return translate('auto.components.sidebar.WorktreeCardRunState.running', 'Running and ready')
}

export function WorktreeCardRunState({ state }: { state: WorkspaceRunState }): React.JSX.Element {
  const label = runStateLabel(state)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex size-4 items-center justify-center" aria-label={label}>
          {state === 'running' ? (
            <Play className="size-3 fill-current text-primary" strokeWidth={0} />
          ) : (
            <Loader2 className="size-3 animate-spin text-muted-foreground" />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
