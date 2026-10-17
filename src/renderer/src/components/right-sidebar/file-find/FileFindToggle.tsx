import React from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type FileFindToggleProps = {
  expanded: boolean
  onToggle: () => void
  label: string
  /** Marks a filter that is still narrowing the list while the bar is collapsed. */
  hasQuery?: boolean
  testId?: string
}

/** The collapsed half of the find bar: a magnifier that lives in each view's own toolbar. */
export function FileFindToggle({
  expanded,
  onToggle,
  label,
  hasQuery = false,
  testId
}: FileFindToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      data-testid={testId}
      className={cn(
        'relative inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        (expanded || hasQuery) && 'bg-muted text-foreground'
      )}
      onClick={onToggle}
      aria-label={label}
      title={label}
      aria-expanded={expanded}
    >
      <Search className="size-3.5" />
      {hasQuery ? (
        <span className="absolute right-1 top-1 size-1.5 rounded-full bg-foreground" />
      ) : null}
    </button>
  )
}
