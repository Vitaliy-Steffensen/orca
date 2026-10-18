import { Loader2, Play } from 'lucide-react'
import { translate } from '@/i18n/i18n'

export function WorktreeCardRunState({
  state
}: {
  state: 'booting' | 'running'
}): React.JSX.Element {
  if (state === 'booting') {
    return (
      <span
        className="inline-flex size-4 items-center justify-center"
        aria-label={translate(
          'auto.components.sidebar.WorktreeCardRunState.booting',
          'Run starting'
        )}
      >
        <Loader2 className="size-3 animate-spin text-muted-foreground" />
      </span>
    )
  }
  return (
    <span
      className="inline-flex size-4 items-center justify-center"
      aria-label={translate('auto.components.sidebar.WorktreeCardRunState.running', 'Run is up')}
    >
      <Play className="size-3 fill-current text-primary" strokeWidth={0} />
    </span>
  )
}
