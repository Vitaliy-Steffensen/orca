import React from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import {
  getPRCommentsListDisplayModeLabel,
  PR_COMMENT_LIST_DISPLAY_MODES,
  type PRCommentsListDisplayMode
} from './use-comments-list-state'

// Fork: split out of comments-list.tsx, which sits at its line cap.
export function CommentDisplayModeMenu({
  displayMode,
  onDisplayModeChange
}: {
  displayMode: PRCommentsListDisplayMode
  onDisplayModeChange: (mode: PRCommentsListDisplayMode) => void
}): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-foreground"
          aria-label={translate(
            'auto.components.right.sidebar.checks.panel.content.f5cf324efa',
            'Comment display options'
          )}
        >
          <SlidersHorizontal className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" sideOffset={6}>
        <DropdownMenuLabel>
          {translate('auto.components.right.sidebar.checks.panel.content.5e6e5a13fa', 'View')}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={displayMode}
          onValueChange={(value) => onDisplayModeChange(value as PRCommentsListDisplayMode)}
        >
          {PR_COMMENT_LIST_DISPLAY_MODES.map((mode) => (
            <DropdownMenuRadioItem key={mode} value={mode}>
              {getPRCommentsListDisplayModeLabel(mode)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
