import type { JSX } from 'react'
import { Archive, ArchiveRestore } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'

export function WorkspaceArchiveMenuItem({
  label,
  isRestore,
  disabled,
  onSelect
}: {
  label: string
  isRestore: boolean
  disabled: boolean
  onSelect: () => void
}): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenuItem onSelect={onSelect} disabled={disabled}>
          {isRestore ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
          {label}
        </DropdownMenuItem>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {isRestore
          ? translate(
              'auto.components.sidebar.WorktreeContextMenu.unarchiveDescription',
              'Put the workspace back in the sidebar. Its terminals wake the next time you open it.'
            )
          : translate(
              'auto.components.sidebar.WorktreeContextMenu.archiveDescription',
              'Shut everything the workspace is running down and hide it, keeping the checkout and its branch. Unarchive brings it back.'
            )}
      </TooltipContent>
    </Tooltip>
  )
}
