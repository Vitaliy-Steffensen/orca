import React, { useCallback, useMemo } from 'react'
import { useAppStore } from '@/store'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { normalizeAgentActivityDisplayMode } from '../../../../shared/constants'
import type { WorktreeCardProperty } from '../../../../shared/ui-chrome-types'
import {
  AGENT_ACTIVITY_DISPLAY_OPTIONS,
  getWorktreeCardPropertyOptions
} from './sidebar-workspace-option-items'
import { translate } from '@/i18n/i18n'

type WorktreeCardDisplayMenuSectionProps = {
  preserveWorkspaceBoardOpen: boolean
}

export function WorktreeCardDisplayMenuSection({
  preserveWorkspaceBoardOpen
}: WorktreeCardDisplayMenuSectionProps): React.JSX.Element {
  const worktreeCardProperties = useAppStore((s) => s.worktreeCardProperties)
  const setWorktreeCardProperties = useAppStore((s) => s.setWorktreeCardProperties)
  const agentActivityDisplayMode = useAppStore((s) => s.agentActivityDisplayMode)
  const setAgentActivityDisplayMode = useAppStore((s) => s.setAgentActivityDisplayMode)
  const projectGroups = useAppStore((s) => s.projectGroups)
  const hasProjectGroups = projectGroups.length > 0
  const worktreeCardPropertyOptions = useMemo(
    () => getWorktreeCardPropertyOptions({ hasProjectGroups }),
    [hasProjectGroups]
  )
  const handleWorktreeCardPropertyChange = useCallback(
    (properties: readonly WorktreeCardProperty[], checked: boolean): void => {
      const next = checked
        ? [...worktreeCardProperties, ...properties]
        : worktreeCardProperties.filter((property) => !properties.includes(property))
      setWorktreeCardProperties(next)
    },
    [setWorktreeCardProperties, worktreeCardProperties]
  )

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <span className="flex flex-1 items-center justify-between gap-3">
          {translate(
            'auto.components.sidebar.SidebarWorkspaceOptionsMenu.newCardDisplay.title',
            'Card display'
          )}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        className="w-56"
        data-workspace-board-preserve-open={preserveWorkspaceBoardOpen ? '' : undefined}
      >
        {worktreeCardPropertyOptions.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt.id}
            checked={opt.properties.every((property) => worktreeCardProperties.includes(property))}
            onCheckedChange={(checked) =>
              handleWorktreeCardPropertyChange(opt.properties, checked === true)
            }
            onSelect={(e) => e.preventDefault()}
          >
            {opt.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
          {translate(
            'auto.components.sidebar.SidebarWorkspaceOptionsMenu.95c9754653',
            'Agent activity layout'
          )}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={agentActivityDisplayMode}
          onValueChange={(value) =>
            setAgentActivityDisplayMode(normalizeAgentActivityDisplayMode(value))
          }
        >
          {AGENT_ACTIVITY_DISPLAY_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem key={opt.id} value={opt.id} onSelect={(e) => e.preventDefault()}>
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
