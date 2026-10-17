import React from 'react'
import { ListFilter, Loader2, Search as SearchIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImeInput } from '@/lib/ime-text-field'
import { translate } from '@/i18n/i18n'
import { FileFindModeSwitch } from './FileFindModeSwitch'
import type { FileFindMode } from './file-find-mode'

export type FileFindBarProps = {
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  mode: FileFindMode
  onModeChange: (mode: FileFindMode) => void
  /** Views with no content-search backend render no mode switch. */
  supportsContents?: boolean
  query: string
  onQueryChange: (value: string) => void
  onClear: () => void
  /** Assigned alongside the bar's own ref so callers can focus or seed the field. */
  inputRef?: React.RefObject<HTMLInputElement | null>
  /** Bumped to re-focus a bar that is already expanded. */
  focusRequestId?: number
  loading?: boolean
  placeholder?: string
  ariaLabel?: string
  /** Mode-specific trailing controls, e.g. the Contents case/word/regex toggles. */
  trailing?: React.ReactNode
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  testId?: string
}

export function FileFindBar({
  expanded,
  onExpandedChange,
  mode,
  onModeChange,
  supportsContents = false,
  query,
  onQueryChange,
  onClear,
  inputRef,
  focusRequestId = 0,
  loading = false,
  placeholder,
  ariaLabel,
  trailing,
  onKeyDown,
  testId
}: FileFindBarProps): React.JSX.Element | null {
  const ownInputRef = React.useRef<HTMLInputElement | null>(null)
  const assignInput = React.useCallback(
    (node: HTMLInputElement | null) => {
      ownInputRef.current = node
      if (inputRef) {
        inputRef.current = node
      }
    },
    [inputRef]
  )

  // Why: expanding is always an intent to type, whether it came from the icon or a shortcut.
  React.useEffect(() => {
    if (expanded) {
      ownInputRef.current?.focus()
      ownInputRef.current?.select()
    }
  }, [expanded, focusRequestId])

  const label =
    ariaLabel ??
    translate('auto.components.right.sidebar.FileExplorerNameFilter.26fb73c6e3', 'Find files')

  if (!expanded) {
    return null
  }

  return (
    <div className="border-b border-border px-2 py-1.5" data-ignore-file-explorer-keys="true">
      {/* Why: show the query field first; the Contents/Names switch sits underneath
         so it reads as choosing the mode for the field above. */}
      <div className="flex flex-col gap-1">
        <div className="flex h-7 items-center gap-1 rounded-sm border border-border bg-input/50 px-1.5 focus-within:border-ring">
          {mode === 'contents' ? (
            <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ListFilter className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <ImeInput
            ref={assignInput}
            type="text"
            data-file-search-input="true"
            data-testid={testId}
            className="min-w-0 flex-1 bg-transparent py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
            aria-label={label}
            placeholder={placeholder ?? label}
            value={query}
            onChange={(event) => onQueryChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) {
                return
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                onClear()
                onExpandedChange(false)
                event.currentTarget.blur()
                return
              }
              onKeyDown?.(event)
            }}
            spellCheck={false}
          />
          {loading ? (
            <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
          ) : null}
          {query ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="h-auto w-auto rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              aria-label={translate(
                'auto.components.right.sidebar.FileExplorerNameFilter.4d5a6b2a49',
                'Clear file filter'
              )}
              onClick={onClear}
            >
              <X className="size-3" />
            </Button>
          ) : null}
          {trailing}
        </div>
        {supportsContents ? <FileFindModeSwitch mode={mode} onSelectMode={onModeChange} /> : null}
      </div>
    </div>
  )
}
