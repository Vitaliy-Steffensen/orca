import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import type { NewWorkspaceProjectOption } from '@/lib/new-workspace-project-options'

export function WorkspacePromptProjectSwitcher({
  options,
  selectedProjectId,
  selectedProjectName,
  onProjectChange
}: {
  options: readonly NewWorkspaceProjectOption[]
  selectedProjectId: string | null
  selectedProjectName: string
  onProjectChange: (projectId: string) => void
}): React.JSX.Element | null {
  if (options.length === 0) {
    return null
  }
  const label =
    selectedProjectName ||
    translate('auto.components.NewWorkspaceComposerCard.dccd26d4e4', 'Choose project')
  if (options.length < 2) {
    return (
      <span className="min-w-0 truncate text-sm font-medium text-foreground" title={label}>
        {label}
      </span>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 max-w-48 gap-1 px-1.5 text-sm font-medium"
          aria-label={translate('components.newWorkspace.prompt.changeProject', 'Change project')}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-72">
        <DropdownMenuRadioGroup
          value={selectedProjectId ?? ''}
          onValueChange={(value) => {
            if (value) {
              onProjectChange(value)
            }
          }}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.id} value={option.id}>
              <span className="truncate">{option.displayName}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
