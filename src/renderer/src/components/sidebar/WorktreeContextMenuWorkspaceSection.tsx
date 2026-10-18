import { DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { Pencil } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import type { WorkspaceStatusDefinition } from '../../../../shared/worktree/types'
import type { WorkspaceAutonomy } from '../../../../shared/workspace-autonomy'
import { WorktreeAutonomyMenuItems } from './WorktreeAutonomyMenuItems'
import { WorktreeStatusMenuItems } from './WorktreeStatusMenuItems'

/** The top of the card menu: rename, status, and autonomy. */
export function WorktreeContextMenuWorkspaceSection(props: {
  contextWorkspaceAutonomy: string
  contextWorkspaceStatus: string
  deletingContext: boolean
  isDeleting: boolean
  isMultiContext: boolean
  onAssignWorkspaceAutonomy: (autonomy: WorkspaceAutonomy) => void
  onAssignWorkspaceStatus: (status: string) => void
  onRename: () => void
  workspaceStatuses: readonly WorkspaceStatusDefinition[]
}) {
  return (
    <>
      <DropdownMenuLabel className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
        {translate('auto.components.sidebar.WorktreeContextMenu.workspaceSection', 'Workspace')}
      </DropdownMenuLabel>
      {!props.isMultiContext && (
        <DropdownMenuItem onSelect={props.onRename} disabled={props.isDeleting}>
          <Pencil className="size-3.5" />
          {translate('auto.components.sidebar.WorktreeContextMenu.439fa94d53', 'Update')}
        </DropdownMenuItem>
      )}
      <WorktreeStatusMenuItems
        contextWorkspaceStatus={props.contextWorkspaceStatus}
        deletingContext={props.deletingContext}
        isMultiContext={props.isMultiContext}
        onAssignWorkspaceStatus={props.onAssignWorkspaceStatus}
        workspaceStatuses={props.workspaceStatuses}
      />
      <WorktreeAutonomyMenuItems
        contextWorkspaceAutonomy={props.contextWorkspaceAutonomy}
        deletingContext={props.deletingContext}
        isMultiContext={props.isMultiContext}
        onAssignWorkspaceAutonomy={props.onAssignWorkspaceAutonomy}
      />
    </>
  )
}
