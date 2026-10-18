import React from 'react'
import { Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'

type WorkspaceKanbanSectionFilterMenuProps = {
  sections: readonly string[]
  hiddenSections: ReadonlySet<string>
  onToggleSection: (section: string) => void
  onShowAllSections: () => void
}

export default function WorkspaceKanbanSectionFilterMenu({
  sections,
  hiddenSections,
  onToggleSection,
  onShowAllSections
}: WorkspaceKanbanSectionFilterMenuProps): React.JSX.Element | null {
  if (sections.length === 0) {
    return null
  }
  const label = translate(
    'auto.components.sidebar.WorkspaceKanbanSectionFilterMenu.0c1e2f3a4b',
    'Sections'
  )
  return (
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label={label} className="relative">
              <Layers className="size-3.5" />
              {hiddenSections.size > 0 ? (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-primary"
                />
              ) : null}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          {label}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" sideOffset={8} collisionPadding={8} className="w-56">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {sections.map((section) => (
          <DropdownMenuCheckboxItem
            key={section}
            checked={!hiddenSections.has(section)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => onToggleSection(section)}
          >
            {section}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={hiddenSections.size === 0} onSelect={onShowAllSections}>
          {translate(
            'auto.components.sidebar.WorkspaceKanbanSectionFilterMenu.5d6e7f8a9b',
            'Show all sections'
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
