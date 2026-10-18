import React from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  getWorkspaceStatusColorOptions,
  getWorkspaceStatusIconOptions,
  getWorkspaceStatusVisualMeta
} from './workspace-status'
import { translate } from '@/i18n/i18n'

type WorkspaceStatusAppearancePopoverProps = {
  label: string
  color?: string
  icon?: string
  onChangeColor: (color: string) => void
  onChangeIcon: (icon: string) => void
  /** Shown when no icon is chosen. Lane buttons omit this and use the default icon. */
  unsetIcon?: React.ComponentType<{ className?: string }>
  tooltip?: string
  ariaLabel?: string
}

export default function WorkspaceStatusAppearancePopover({
  label,
  color,
  icon,
  onChangeColor,
  onChangeIcon,
  unsetIcon,
  tooltip,
  ariaLabel
}: WorkspaceStatusAppearancePopoverProps): React.JSX.Element {
  const meta = getWorkspaceStatusVisualMeta({
    id: label,
    label,
    ...(color === undefined ? {} : { color }),
    ...(icon === undefined ? {} : { icon })
  })
  const PreviewIcon = icon === undefined && unsetIcon ? unsetIcon : meta.icon
  const tone = color === undefined && unsetIcon ? 'text-muted-foreground' : meta.tone

  return (
    <Popover modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="relative size-7"
              aria-label={
                ariaLabel ??
                translate(
                  'auto.components.sidebar.WorkspaceStatusAppearancePopover.ccbd1e2c69',
                  'Customize {{value0}} appearance',
                  { value0: label }
                )
              }
            >
              <span className={cn('absolute size-4 rounded-full opacity-20', meta.swatch)} />
              <PreviewIcon className={cn('relative size-3.5', tone)} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          {tooltip ??
            translate(
              'auto.components.sidebar.WorkspaceStatusAppearancePopover.74b1413279',
              'Appearance'
            )}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        side="left"
        sideOffset={8}
        className="z-[80] w-72 p-2"
        data-workspace-status-appearance-popover=""
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="px-1 py-1 text-[11px] font-semibold text-muted-foreground">
          {translate(
            'auto.components.sidebar.WorkspaceStatusAppearancePopover.2ac106f6b2',
            'Color'
          )}
        </div>
        <div className="grid grid-cols-8 gap-1">
          {getWorkspaceStatusColorOptions().map((colorOption) => (
            <Tooltip key={colorOption.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'flex size-8 items-center justify-center rounded-md border border-transparent outline-none transition-colors hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring',
                    color === colorOption.id && 'border-ring bg-accent'
                  )}
                  onClick={() => onChangeColor(colorOption.id)}
                  aria-label={translate(
                    'auto.components.sidebar.WorkspaceStatusAppearancePopover.514be2f569',
                    'Set {{value0}} color to {{value1}}',
                    { value0: label, value1: colorOption.label }
                  )}
                >
                  <span className={cn('size-3.5 rounded-full', colorOption.swatch)} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                {colorOption.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="mt-2 px-1 py-1 text-[11px] font-semibold text-muted-foreground">
          {translate('auto.components.sidebar.WorkspaceStatusAppearancePopover.8be427206b', 'Icon')}
        </div>
        <div className="grid grid-cols-6 gap-1">
          {getWorkspaceStatusIconOptions().map((iconOption) => (
            <Tooltip key={iconOption.id}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={icon === iconOption.id ? 'secondary' : 'ghost'}
                  size="icon-xs"
                  className="size-8"
                  onClick={() => onChangeIcon(iconOption.id)}
                  aria-label={translate(
                    'auto.components.sidebar.WorkspaceStatusAppearancePopover.514be2f569',
                    'Set {{value0}} icon to {{value1}}',
                    { value0: label, value1: iconOption.label }
                  )}
                >
                  <iconOption.icon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                {iconOption.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
