import { Send } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStore } from '@/store'
import { useOptionalShortcutLabel } from '@/hooks/useShortcutLabel'
import { translate } from '@/i18n/i18n'
import {
  sendQueuedPRCommentsForActiveWorktree,
  useQueuedPRCommentCount
} from '@/components/right-sidebar/queued-pr-comments-send'

// Fork: queued PR comments stay one click (or ⌥⌘S) from sending, whichever panel is open.
export function QueuedCommentsStatusSegment({
  iconOnly
}: {
  iconOnly: boolean
}): React.JSX.Element | null {
  const activeWorktreeId = useAppStore((state) => state.activeWorktreeId)
  const count = useQueuedPRCommentCount(activeWorktreeId)
  const shortcut = useOptionalShortcutLabel('sourceControl.sendQueuedComments')
  if (count === 0) {
    return null
  }
  const label = translate('queuedComments.send', 'Send {{count}} queued comments', { count })
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-primary-foreground hover:bg-primary/90"
          onClick={() => sendQueuedPRCommentsForActiveWorktree()}
        >
          <Send className="size-3" />
          {iconOnly ? count : translate('queuedComments.badge', '{{count}} queued', { count })}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {shortcut ? `${label} (${shortcut})` : label}
      </TooltipContent>
    </Tooltip>
  )
}
