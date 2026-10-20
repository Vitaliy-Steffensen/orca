import React from 'react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getActiveGitState, type GitStateTone } from './right-sidebar-git-state'
import { RIGHT_SIDEBAR_HEADER_NO_DRAG_CLASS_NAME } from './right-sidebar-titlebar-drag-regions'

const TONE_VARIANT = {
  success: 'cardChipSuccess',
  warning: 'cardChipWarn',
  destructive: 'cardChipAlert',
  muted: 'cardChipQuiet'
} as const satisfies Record<GitStateTone, string>

export function GitStateBadge({ className }: { className?: string }): React.JSX.Element | null {
  const gitState = useAppStore((s) => (s.rightSidebarOpen ? getActiveGitState(s) : null))
  if (!gitState) {
    return null
  }
  return (
    <div
      className={cn(
        'flex min-w-0 shrink items-center overflow-hidden',
        RIGHT_SIDEBAR_HEADER_NO_DRAG_CLASS_NAME,
        className
      )}
      data-testid="git-state-badge"
      data-git-state={gitState.id}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={TONE_VARIANT[gitState.tone]}>{gitState.label}</Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom">{gitState.tooltip}</TooltipContent>
      </Tooltip>
    </div>
  )
}
