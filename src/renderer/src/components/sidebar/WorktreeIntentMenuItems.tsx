import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { MessageCircle, ListTodo } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import type { WorkspaceIntent } from '../../../../shared/workspace-intent'

export function WorktreeIntentMenuItems(props: {
  contextWorkspaceIntent: string
  deletingContext: boolean
  isMultiContext: boolean
  onAssignWorkspaceIntent: (intent: WorkspaceIntent) => void
}) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={props.deletingContext}>
        <MessageCircle className="size-3.5" />
        {props.isMultiContext
          ? translate('workspace.intent.menuMulti', 'Set Intent')
          : translate('workspace.intent.menu', 'Intent')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-44">
        <DropdownMenuRadioGroup value={props.contextWorkspaceIntent}>
          <DropdownMenuRadioItem
            value="question"
            onSelect={() => props.onAssignWorkspaceIntent('question')}
          >
            <MessageCircle className="size-3.5 text-muted-foreground" />
            {translate('workspace.intent.question', 'Question')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="task"
            onSelect={() => props.onAssignWorkspaceIntent('task')}
          >
            <ListTodo className="size-3.5 text-muted-foreground" />
            {translate('workspace.intent.task', 'Task')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
