import { ImeInput } from '@/lib/ime-text-field'
import React from 'react'
import { Layers, Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SettingsSwitch } from '../settings/SettingsFormControls'
import type { WorkspaceStatusDefinition } from '../../../../shared/worktree/types'
import {
  getWorkspaceStatusSectionAppearance,
  getWorkspaceStatusSectionOrder
} from '../../../../shared/workspace-status-sections'
import WorkspaceStatusAppearancePopover from './WorkspaceStatusAppearancePopover'
import WorkspaceStatusLaneRow from './WorkspaceStatusLaneRow'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'

type WorkspaceKanbanSettingsMenuProps = {
  workspaceStatuses: readonly WorkspaceStatusDefinition[]
  syncTaskStatusFromWorkspaceBoard: boolean
  onSyncTaskStatusFromWorkspaceBoardChange: (enabled: boolean) => void
  onRenameStatus: (statusId: string, label: string) => void
  onChangeStatusColor: (statusId: string, color: string) => void
  onChangeStatusIcon: (statusId: string, icon: string) => void
  onChangeStatusSection: (statusId: string, section: string) => void
  onChangeSectionColor: (section: string, color: string) => void
  onChangeSectionIcon: (section: string, icon: string) => void
  onRenameSection: (section: string, name: string) => void
  onMoveStatus: (statusId: string, direction: -1 | 1) => void
  onRemoveStatus: (statusId: string) => void
  onAddStatus: (section?: string) => void
}

function SectionAppearanceButton({
  section,
  workspaceStatuses,
  onChangeSectionColor,
  onChangeSectionIcon
}: {
  section: string
  workspaceStatuses: readonly WorkspaceStatusDefinition[]
  onChangeSectionColor: (section: string, color: string) => void
  onChangeSectionIcon: (section: string, icon: string) => void
}): React.JSX.Element {
  const appearance = getWorkspaceStatusSectionAppearance(section, workspaceStatuses)
  return (
    <WorkspaceStatusAppearancePopover
      label={section}
      color={appearance.color}
      icon={appearance.icon}
      unsetIcon={Layers}
      tooltip={translate(
        'auto.components.sidebar.WorkspaceKanbanSettingsMenu.a31c7e4b92',
        'Section appearance'
      )}
      ariaLabel={translate(
        'auto.components.sidebar.WorkspaceKanbanSettingsMenu.c4e8a91d07',
        'Customize {{value0}} section appearance',
        { value0: section }
      )}
      onChangeColor={(color) => onChangeSectionColor(section, color)}
      onChangeIcon={(icon) => onChangeSectionIcon(section, icon)}
    />
  )
}

type StatusGroup = { section?: string; statuses: WorkspaceStatusDefinition[] }

function groupStatuses(
  statuses: readonly WorkspaceStatusDefinition[],
  savedSections: readonly string[]
): StatusGroup[] {
  const loose = statuses.filter((status) => status.section === undefined)
  return [
    ...(loose.length > 0 ? [{ statuses: loose }] : []),
    ...getWorkspaceStatusSectionOrder(statuses, savedSections).map((section) => ({
      section,
      statuses: statuses.filter((status) => status.section === section)
    }))
  ]
}

function SectionHeader({
  section,
  count,
  workspaceStatuses,
  onChangeSectionColor,
  onChangeSectionIcon,
  onRenameSection,
  onAddStatus
}: {
  section: string
  count: number
  workspaceStatuses: readonly WorkspaceStatusDefinition[]
  onChangeSectionColor: (section: string, color: string) => void
  onChangeSectionIcon: (section: string, icon: string) => void
  onRenameSection: (section: string, name: string) => void
  onAddStatus: (section?: string) => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-0.5 pr-0.5">
      <SectionAppearanceButton
        section={section}
        workspaceStatuses={workspaceStatuses}
        onChangeSectionColor={onChangeSectionColor}
        onChangeSectionIcon={onChangeSectionIcon}
      />
      <ImeInput
        key={section}
        defaultValue={section}
        onBlur={(event) => {
          if (event.target.value.trim()) {
            onRenameSection(section, event.target.value)
          } else {
            event.target.value = section
          }
        }}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
        className="h-6 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-xs font-semibold text-foreground outline-none hover:border-input focus-visible:border-input focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
        aria-label={translate(
          'auto.components.sidebar.WorkspaceKanbanSettingsMenu.7d2a4c8e51',
          'Rename section {{value0}}',
          { value0: section }
        )}
      />
      <span className="px-1 text-2xs tabular-nums text-muted-foreground">{count}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-6"
            onClick={() => onAddStatus(section)}
            aria-label={translate(
              'auto.components.sidebar.WorkspaceKanbanSettingsMenu.6f1b3d9a27',
              'Add status to {{value0}}',
              { value0: section }
            )}
          >
            <Plus className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          {translate(
            'auto.components.sidebar.WorkspaceKanbanSettingsMenu.4e9c2a7b18',
            'Add status to section'
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function nextSectionName(existing: readonly string[]): string {
  const base = translate(
    'auto.components.sidebar.WorkspaceKanbanSettingsMenu.8a4e1c6d30',
    'New section'
  )
  let name = base
  for (let n = 2; existing.includes(name); n += 1) {
    name = `${base} ${n}`
  }
  return name
}

export default function WorkspaceKanbanSettingsMenu({
  workspaceStatuses,
  syncTaskStatusFromWorkspaceBoard,
  onSyncTaskStatusFromWorkspaceBoardChange,
  onRenameStatus,
  onChangeStatusColor,
  onChangeStatusIcon,
  onChangeStatusSection,
  onChangeSectionColor,
  onChangeSectionIcon,
  onRenameSection,
  onMoveStatus,
  onRemoveStatus,
  onAddStatus
}: WorkspaceKanbanSettingsMenuProps): React.JSX.Element {
  const savedSections = useAppStore((state) => state.workspaceStatusSidebarOrder.sections)
  const groups = groupStatuses(workspaceStatuses, savedSections)
  const sectionNames = getWorkspaceStatusSectionOrder(workspaceStatuses, savedSections)
  const newSectionName = nextSectionName(sectionNames)
  return (
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={translate(
                'auto.components.sidebar.WorkspaceKanbanSettingsMenu.26cbc92150',
                'Workspace board settings'
              )}
              data-contextual-tour-target="workspace-board-settings"
              className="text-muted-foreground"
            >
              <Settings className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          {translate(
            'auto.components.sidebar.WorkspaceKanbanSettingsMenu.34f03eb0de',
            'Board settings'
          )}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={8}
        className="max-h-[min(80vh,720px)] w-80 overflow-y-auto p-2 scrollbar-sleek"
        onInteractOutside={(event) => {
          const target = event.target
          if (
            target instanceof Element &&
            target.closest('[data-workspace-status-appearance-popover]')
          ) {
            event.preventDefault()
          }
        }}
      >
        <div className="px-1 pb-2">
          <div className="flex items-start justify-between gap-3 rounded-md px-1.5 py-1.5 hover:bg-worktree-sidebar-accent/70">
            <span className="min-w-0 space-y-0.5">
              <span className="block text-xs font-medium leading-4 text-foreground">
                {translate(
                  'auto.components.sidebar.WorkspaceKanbanSettingsMenu.87d24a0c2f',
                  'Sync board and issue status'
                )}
              </span>
              <span className="block text-2xs leading-4 text-muted-foreground">
                {translate(
                  'auto.components.sidebar.WorkspaceKanbanSettingsMenu.4c2eaa78cc',
                  'Moving a linked workspace updates its Linear issue status when a matching workflow state exists.'
                )}
              </span>
            </span>
            <SettingsSwitch
              checked={syncTaskStatusFromWorkspaceBoard}
              onChange={() =>
                onSyncTaskStatusFromWorkspaceBoardChange(!syncTaskStatusFromWorkspaceBoard)
              }
              ariaLabel={translate(
                'auto.components.sidebar.WorkspaceKanbanSettingsMenu.87d24a0c2f',
                'Sync board and issue status'
              )}
            />
          </div>
        </div>
        <DropdownMenuLabel>
          {translate('auto.components.sidebar.WorkspaceKanbanSettingsMenu.395e541d5d', 'Statuses')}
        </DropdownMenuLabel>
        <div className="space-y-2 px-1 pb-1">
          {groups.map((group) => {
            const lanes = group.statuses.map((status, index) => (
              <WorkspaceStatusLaneRow
                key={status.id}
                status={status}
                sections={sectionNames}
                canMoveUp={index > 0}
                canMoveDown={index < group.statuses.length - 1}
                canRemove={workspaceStatuses.length > 1}
                onRename={(label) => onRenameStatus(status.id, label)}
                onChangeColor={(color) => onChangeStatusColor(status.id, color)}
                onChangeIcon={(icon) => onChangeStatusIcon(status.id, icon)}
                onChangeSection={(section) => onChangeStatusSection(status.id, section)}
                onMove={(direction) => onMoveStatus(status.id, direction)}
                onRemove={() => onRemoveStatus(status.id)}
              />
            ))
            if (group.section === undefined) {
              return (
                <div key="loose" className="space-y-0.5">
                  {lanes}
                </div>
              )
            }
            return (
              <div key={group.section} className="space-y-0.5">
                <SectionHeader
                  section={group.section}
                  count={group.statuses.length}
                  workspaceStatuses={workspaceStatuses}
                  onChangeSectionColor={onChangeSectionColor}
                  onChangeSectionIcon={onChangeSectionIcon}
                  onRenameSection={onRenameSection}
                  onAddStatus={onAddStatus}
                />
                <div className="ml-3.5 space-y-0.5 border-l border-border pl-1.5">{lanes}</div>
              </div>
            )
          })}
          <div className="flex items-center gap-1 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-7 flex-1 justify-start"
              onClick={() => onAddStatus()}
            >
              <Plus className="size-3.5" />
              {translate(
                'auto.components.sidebar.WorkspaceKanbanSettingsMenu.79eb990aa4',
                'Add status'
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-7 flex-1 justify-start"
              onClick={() => onAddStatus(newSectionName)}
            >
              <Layers className="size-3.5" />
              {translate(
                'auto.components.sidebar.WorkspaceKanbanSettingsMenu.2b8d5f0c94',
                'Add section'
              )}
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
