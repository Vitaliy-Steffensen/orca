import React from 'react'
import { ArrowDown, ArrowUp, Check, FolderInput, Trash2 } from 'lucide-react'
import { ImeInput } from '@/lib/ime-text-field'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { WorkspaceStatusDefinition } from '../../../../shared/worktree/types'
import WorkspaceStatusAppearancePopover from './WorkspaceStatusAppearancePopover'
import { WorkspaceStatusAutomationBadge } from './WorkspaceStatusAutomationBadge'

type WorkspaceStatusLaneRowProps = {
  status: WorkspaceStatusDefinition
  sections: readonly string[]
  canMoveUp: boolean
  canMoveDown: boolean
  canRemove: boolean
  onRename: (label: string) => void
  onChangeColor: (color: string) => void
  onChangeIcon: (icon: string) => void
  onChangeSection: (section: string) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}

function RowIconButton({
  label,
  disabled,
  destructive,
  onClick,
  children
}: {
  label: string
  disabled?: boolean
  destructive?: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={destructive ? 'ghost-destructive' : 'ghost'}
          size="icon-xs"
          className="size-6"
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export default function WorkspaceStatusLaneRow({
  status,
  sections,
  canMoveUp,
  canMoveDown,
  canRemove,
  onRename,
  onChangeColor,
  onChangeIcon,
  onChangeSection,
  onMove,
  onRemove
}: WorkspaceStatusLaneRowProps): React.JSX.Element {
  return (
    <div className="group/lane relative flex items-center gap-0.5 rounded-md pr-0.5 hover:bg-accent focus-within:bg-accent">
      <WorkspaceStatusAppearancePopover
        label={status.label}
        color={status.color}
        icon={status.icon}
        onChangeColor={onChangeColor}
        onChangeIcon={onChangeIcon}
      />
      <WorkspaceStatusAutomationBadge status={status} className="shrink-0" />
      <ImeInput
        defaultValue={status.label}
        onBlur={(event) => onRename(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
        className="h-6 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-xs text-foreground outline-none hover:border-input focus-visible:border-input focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
        aria-label={translate(
          'auto.components.sidebar.WorkspaceKanbanSettingsMenu.8ce44af9a8',
          'Rename {{value0}}',
          { value0: status.label }
        )}
      />
      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/lane:opacity-100 group-focus-within/lane:opacity-100">
        <Popover modal={false}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-6"
                  aria-label={translate(
                    'auto.components.sidebar.WorkspaceKanbanSettingsMenu.5e7d2b9c40',
                    'Move {{value0}} to a section',
                    { value0: status.label }
                  )}
                >
                  <FolderInput className="size-3.5" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              {translate(
                'auto.components.sidebar.WorkspaceKanbanSettingsMenu.9b3f6a1e82',
                'Move to section'
              )}
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            align="end"
            side="left"
            sideOffset={8}
            className="z-[80] w-48"
            data-workspace-status-appearance-popover=""
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            {[...sections, ''].map((section) => {
              const selected = (status.section ?? '') === section
              return (
                <button
                  key={section || 'none'}
                  type="button"
                  className="flex h-7 w-full items-center gap-2 rounded-sm px-2 text-left text-xs outline-none hover:bg-accent focus-visible:bg-accent"
                  onClick={() => onChangeSection(section)}
                >
                  <Check className={cn('size-3.5 shrink-0', !selected && 'opacity-0')} />
                  <span className={cn('truncate', !section && 'text-muted-foreground')}>
                    {section ||
                      translate(
                        'auto.components.sidebar.WorkspaceKanbanSettingsMenu.1c8e5d7a63',
                        'No section'
                      )}
                  </span>
                </button>
              )
            })}
          </PopoverContent>
        </Popover>
        <RowIconButton
          label={translate(
            'auto.components.sidebar.WorkspaceKanbanSettingsMenu.b45b350eb0',
            'Move {{value0}} up',
            { value0: status.label }
          )}
          disabled={!canMoveUp}
          onClick={() => onMove(-1)}
        >
          <ArrowUp className="size-3.5" />
        </RowIconButton>
        <RowIconButton
          label={translate(
            'auto.components.sidebar.WorkspaceKanbanSettingsMenu.3a6c9e1f75',
            'Move {{value0}} down',
            { value0: status.label }
          )}
          disabled={!canMoveDown}
          onClick={() => onMove(1)}
        >
          <ArrowDown className="size-3.5" />
        </RowIconButton>
        <RowIconButton
          label={translate(
            'auto.components.sidebar.WorkspaceKanbanSettingsMenu.054cb50df7',
            'Remove {{value0}}',
            { value0: status.label }
          )}
          disabled={!canRemove}
          destructive
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
        </RowIconButton>
      </div>
    </div>
  )
}
