import type React from 'react'
import { translate } from '@/i18n/i18n'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { FileFindMode } from './file-find-mode'

type FileFindModeSwitchProps = {
  mode: FileFindMode
  onSelectMode: (mode: FileFindMode) => void
}

type FileFindModeOption = {
  mode: FileFindMode
  label: string
  ariaLabel: string
}

const VIEW_SWITCH_ITEM_CLASS =
  'h-full min-w-0 flex-1 shrink rounded-sm px-2 text-[11px] font-normal text-muted-foreground transition-[color,background-color,box-shadow] hover:bg-background/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring data-[state=on]:bg-background data-[state=on]:font-medium data-[state=on]:text-foreground data-[state=on]:shadow-xs data-[state=on]:hover:bg-background data-[state=on]:hover:text-foreground'

export function FileFindModeSwitch({
  mode,
  onSelectMode
}: FileFindModeSwitchProps): React.JSX.Element {
  const options: FileFindModeOption[] = [
    {
      mode: 'names',
      label: translate('auto.components.right.sidebar.FileExplorerViewSwitch.c4e9a2b713', 'Names'),
      ariaLabel: translate(
        'auto.components.right.sidebar.FileExplorerViewSwitch.b3c8f1a902',
        'Filter files by name'
      )
    },
    {
      mode: 'contents',
      label: translate(
        'auto.components.right.sidebar.FileExplorerNameFilter.7a9fb1e6aa',
        'Contents'
      ),
      ariaLabel: translate(
        'auto.components.right.sidebar.FileExplorerToolbar.c1f3f3ec70',
        'Search file contents'
      )
    }
  ]

  return (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={(value) => {
        if (value === 'names' || value === 'contents') {
          onSelectMode(value)
        }
      }}
      aria-label={translate(
        'auto.components.right.sidebar.FileExplorerViewSwitch.f8a2c4d1e0',
        'Explorer search mode'
      )}
      className="flex h-7 w-full items-center gap-0.5 rounded-md bg-input/40 p-0.5"
      data-ignore-file-explorer-keys="true"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.mode}
          value={option.mode}
          aria-label={option.ariaLabel}
          className={VIEW_SWITCH_ITEM_CLASS}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
