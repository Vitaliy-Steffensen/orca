import React from 'react'
import { Check, Filter, PanelLeftClose, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { translate } from '@/i18n/i18n'

export function CombinedDiffFileTreeHeader({
  query,
  setQuery,
  availableExtensions,
  excludedExtensions,
  toggleExtension,
  includeViewed,
  setIncludeViewed,
  activeFilterCount,
  resetFilters,
  onCollapsedChange
}: {
  query: string
  setQuery: (query: string) => void
  availableExtensions: readonly string[]
  excludedExtensions: Set<string>
  toggleExtension: (extension: string) => void
  includeViewed: boolean
  setIncludeViewed: React.Dispatch<React.SetStateAction<boolean>>
  activeFilterCount: number
  resetFilters: () => void
  onCollapsedChange: (collapsed: boolean) => void
}): React.JSX.Element {
  return (
    <div className="sticky top-0 z-20 shrink-0 bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          {translate('auto.components.editor.CombinedDiffFileTree.481e63ca52', 'Files')}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={translate(
            'auto.components.editor.CombinedDiffFileTree.21783df79f',
            'Collapse file tree'
          )}
          onClick={() => onCollapsedChange(true)}
        >
          <PanelLeftClose className="size-3.5" />
        </Button>
      </div>
      <div className="flex items-center gap-2 border-b border-border px-2 py-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={translate(
              'auto.components.editor.CombinedDiffFileTree.4cc7b83ffe',
              'Filter files...'
            )}
            className="h-8 pl-7 text-xs"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={translate(
                'auto.components.editor.CombinedDiffFileTree.cd0e0ed79e',
                'Filter diff files'
              )}
              className={cn(activeFilterCount > 0 && 'border-foreground/30 text-foreground')}
            >
              <Filter className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" sideOffset={6} className="w-56 p-0">
            <div className="border-b border-border px-3 py-2 text-xs font-semibold text-foreground">
              {translate(
                'auto.components.editor.CombinedDiffFileTree.c00020f081',
                'File extensions'
              )}
            </div>
            <div className="max-h-60 overflow-auto py-1 scrollbar-sleek">
              {availableExtensions.map((extension) => {
                const checked = !excludedExtensions.has(extension)
                return (
                  <button
                    key={extension}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={() => toggleExtension(extension)}
                  >
                    <Check
                      className={cn('size-3.5 shrink-0', checked ? 'opacity-100' : 'opacity-0')}
                    />
                    <span className="min-w-0 flex-1 truncate">{extension}</span>
                  </button>
                )
              })}
            </div>
            <div className="border-t border-border py-1">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => setIncludeViewed((prev) => !prev)}
              >
                <Check
                  className={cn('size-3.5 shrink-0', includeViewed ? 'opacity-100' : 'opacity-0')}
                />
                <span className="min-w-0 flex-1 truncate">
                  {translate(
                    'auto.components.editor.CombinedDiffFileTree.be119cb9d1',
                    'Viewed files'
                  )}
                </span>
              </button>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onClick={resetFilters}
                >
                  {translate(
                    'auto.components.editor.CombinedDiffFileTree.eafe1aeb53',
                    'Reset filters'
                  )}
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
