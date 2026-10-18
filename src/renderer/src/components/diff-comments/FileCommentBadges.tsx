import React from 'react'
import { Bot, MessageSquare, MessagesSquare, PencilLine } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { FileCommentCounts } from './file-comment-counts'

type BadgeKind = {
  key: keyof FileCommentCounts
  icon: LucideIcon
  className: string
  title: (count: number) => string
}

// Why this order: what someone else is waiting on reads first, your own unsent work last.
const BADGE_KINDS: readonly BadgeKind[] = [
  {
    key: 'notes',
    icon: MessageSquare,
    className: 'text-muted-foreground',
    title: (count) =>
      translate(
        'auto.components.right.sidebar.SourceControl.657e0c90ad',
        '{{value0}} note{{value1}}',
        {
          value0: count,
          value1: count === 1 ? '' : 's'
        }
      )
  },
  {
    key: 'agentNotes',
    icon: Bot,
    className: 'text-ai-action-accent',
    title: (count) =>
      translate(
        'auto.components.right.sidebar.AgentNoteFileBadge.title',
        '{{value0}} agent note{{value1}}',
        { value0: count, value1: count === 1 ? '' : 's' }
      )
  },
  {
    key: 'unresolvedThreads',
    icon: MessagesSquare,
    className: 'text-status-warning',
    title: (count) =>
      translate(
        'auto.components.right.sidebar.SourceControl.unresolvedThreads',
        '{{value0}} unresolved review thread{{value1}}',
        { value0: count, value1: count === 1 ? '' : 's' }
      )
  },
  {
    key: 'pendingReview',
    icon: PencilLine,
    className: 'text-status-warning',
    title: (count) =>
      translate(
        'auto.components.pendingReview.rowBadge',
        '{{value0}} review comment{{value1}} waiting to be submitted',
        { value0: count, value1: count === 1 ? '' : 's' }
      )
  }
]

/**
 * What a file still carries, as one icon and count per kind, for any file row in the app.
 *
 * Why nothing renders at zero: a reviewer scans a tree for what is left to deal with, and a row
 * of zeroes is noise that hides the one file that needs them.
 */
export function FileCommentBadges({
  counts
}: {
  counts: FileCommentCounts | undefined
}): React.JSX.Element | null {
  if (!counts) {
    return null
  }
  const shown = BADGE_KINDS.filter((kind) => counts[kind.key] > 0)
  if (shown.length === 0) {
    return null
  }
  return (
    <>
      {shown.map((kind) => {
        const count = counts[kind.key]
        return (
          <span
            key={kind.key}
            data-file-comment-badge={kind.key}
            className={cn('flex shrink-0 items-center gap-0.5 text-3xs', kind.className)}
            title={kind.title(count)}
          >
            <kind.icon className="size-3" />
            <span className="tabular-nums">{count}</span>
          </span>
        )
      })}
    </>
  )
}
