import React from 'react'
import { useAppStore } from '@/store'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getActiveGitState, type GitStateTone } from './right-sidebar-git-state'

const TONE_VARIANT = {
  success: 'cardChipSuccess',
  warning: 'cardChipWarn',
  destructive: 'cardChipAlert',
  muted: 'cardChipQuiet'
} as const satisfies Record<GitStateTone, string>

export function GitStateBanner(): React.JSX.Element | null {
  const gitState = useAppStore((s) => (s.rightSidebarOpen ? getActiveGitState(s) : null))
  if (!gitState) {
    return null
  }
  return (
    <div
      className="flex items-center px-3 py-1.5 border-b border-border"
      data-testid="git-state-banner"
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
