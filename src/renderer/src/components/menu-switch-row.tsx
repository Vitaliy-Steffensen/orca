import React from 'react'
import { DropdownMenuShortcut } from '@/components/ui/dropdown-menu'
import { SwitchIndicator } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

/**
 * Switch row shared by menus that toggle options in place (the sidebar filter
 * dropdown, the workspace options menu, the auto-merge menu). Extracted so the
 * copies cannot drift as rows are added.
 */
export function MenuSwitchRow({
  icon,
  label,
  ariaLabel,
  checked,
  onChange,
  shortcutLabel,
  indented = false,
  disabled = false
}: {
  icon: React.ReactNode
  label: string
  /** Full sentence for assistive tech when `label` only reads in visual context. */
  ariaLabel?: string
  checked: boolean
  onChange: (next: boolean) => void
  shortcutLabel?: string
  /** Renders the row as a sub-option of the row above it. */
  indented?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        // Why pl-* and not px-2 + pl-6: Tailwind v4 emits px as padding-inline,
        // which outranks a physical pl-6 override and flattens the indent.
        'flex w-full items-center justify-between gap-2 rounded-[5px] py-1.5 pr-2 text-[12px] font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        indented ? 'pl-7' : 'pl-2'
      )}
    >
      <span
        className={cn(
          'inline-flex items-center gap-2',
          indented ? 'text-muted-foreground' : 'text-foreground'
        )}
      >
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </span>
      <span className="inline-flex items-center gap-2">
        {shortcutLabel ? <DropdownMenuShortcut>{shortcutLabel}</DropdownMenuShortcut> : null}
        <SwitchIndicator
          checked={checked}
          size="compact"
          className="data-[state=checked]:bg-primary"
        />
      </span>
    </button>
  )
}
