import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { Kanban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { getWorkspaceStatusVisualMeta } from './workspace-status'
import {
  getLockedWorkspaceStatuses,
  getManualWorkspaceStatuses
} from '../../../../shared/workspace-status-automation'
import { WorkspaceStatusAutomationBadge } from './WorkspaceStatusAutomationBadge'
import type { WorkspaceStatusDefinition } from '../../../../shared/worktree/types'

function StatusRow(props: {
  status: WorkspaceStatusDefinition
  disabled: boolean
  onSelect: (status: string) => void
}) {
  const meta = getWorkspaceStatusVisualMeta(props.status)
  return (
    <DropdownMenuRadioItem
      value={props.status.id}
      disabled={props.disabled}
      onSelect={() => {
        if (!props.disabled) {
          props.onSelect(props.status.id)
        }
      }}
    >
      <meta.icon className={cn('size-3.5', meta.tone)} />
      <span className="flex-1 truncate">{props.status.label}</span>
      <WorkspaceStatusAutomationBadge status={props.status} />
    </DropdownMenuRadioItem>
  )
}

export function WorktreeStatusMenuItems(props: {
  contextWorkspaceStatus: string
  deletingContext: boolean
  isMultiContext: boolean
  onAssignWorkspaceStatus: (status: string) => void
  workspaceStatuses: readonly WorkspaceStatusDefinition[]
}) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={props.deletingContext}>
        <Kanban className="size-3.5" />
        {props.isMultiContext
          ? translate('auto.components.sidebar.WorktreeContextMenu.56cde9e8e6', 'Move Statuses To')
          : translate('auto.components.sidebar.WorktreeContextMenu.84cdbb7e30', 'Move to Status')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-44">
        <DropdownMenuRadioGroup value={props.contextWorkspaceStatus}>
          {getManualWorkspaceStatuses(props.workspaceStatuses).map((status) => (
            <StatusRow
              key={status.id}
              status={status}
              disabled={false}
              onSelect={props.onAssignWorkspaceStatus}
            />
          ))}
          {/* Why shown but never selectable: the user still has to see where a card is,
              and automation is the only thing allowed to put one in these lanes. */}
          {getLockedWorkspaceStatuses(props.workspaceStatuses).length > 0 ? (
            <DropdownMenuSeparator />
          ) : null}
          {getLockedWorkspaceStatuses(props.workspaceStatuses).map((status) => (
            <StatusRow
              key={status.id}
              status={status}
              disabled
              onSelect={props.onAssignWorkspaceStatus}
            />
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
