import { CirclePause, RefreshCw, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { WorkspaceStatusDefinition } from '../../../../shared/worktree/types'

/**
 * The mark that says work arrives in a lane on its own. Without it an automatic move
 * looks exactly like one the user made, which is the whole reason it exists.
 */
export function WorkspaceStatusAutomationBadge(props: {
  status: Pick<WorkspaceStatusDefinition, 'autoFilled' | 'autoPull' | 'holdsAutomation'>
  className?: string
}) {
  if (
    props.status.autoFilled !== true &&
    props.status.autoPull !== true &&
    props.status.holdsAutomation !== true
  ) {
    return null
  }
  return (
    <span className={cn('inline-flex items-center gap-0.5', props.className)}>
      {props.status.autoFilled === true ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Zap className="size-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            {translate(
              'auto.components.sidebar.workspaceStatus.autoFilled',
              'Work lands here on its own'
            )}
          </TooltipContent>
        </Tooltip>
      ) : null}
      {props.status.autoPull === true ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <RefreshCw className="size-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            {translate(
              'auto.components.sidebar.workspaceStatus.autoPull',
              'Workspaces here are kept on the pull request’s latest commit'
            )}
          </TooltipContent>
        </Tooltip>
      ) : null}
      {props.status.holdsAutomation === true ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <CirclePause className="size-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            {translate(
              'auto.components.sidebar.workspaceStatus.holdsAutomation',
              'Workspaces here stay put until their run has finished'
            )}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  )
}
