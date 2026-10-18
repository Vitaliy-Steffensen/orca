import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { Bot, UserRoundCheck } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import type { WorkspaceAutonomy } from '../../../../shared/workspace-autonomy'

export function WorktreeAutonomyMenuItems(props: {
  contextWorkspaceAutonomy: string
  deletingContext: boolean
  isMultiContext: boolean
  onAssignWorkspaceAutonomy: (autonomy: WorkspaceAutonomy) => void
}) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={props.deletingContext}>
        <Bot className="size-3.5" />
        {props.isMultiContext
          ? translate('workspace.autonomy.menuMulti', 'Set Autonomy')
          : translate('workspace.autonomy.menu', 'Autonomy')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-44">
        <DropdownMenuRadioGroup value={props.contextWorkspaceAutonomy}>
          <DropdownMenuRadioItem
            value="autonomous"
            onSelect={() => props.onAssignWorkspaceAutonomy('autonomous')}
          >
            <Bot className="size-3.5 text-muted-foreground" />
            {translate('workspace.autonomy.autonomous', 'Autonomous')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="supervised"
            onSelect={() => props.onAssignWorkspaceAutonomy('supervised')}
          >
            <UserRoundCheck className="size-3.5 text-muted-foreground" />
            {translate('workspace.autonomy.supervised', 'Supervised')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
