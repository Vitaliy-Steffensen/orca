import React from 'react'
import { Badge } from '@/components/ui/badge'
import { CircleCheck, CircleDot, CircleX, Clock, GitMerge } from 'lucide-react'
import { PullRequestIcon, checksLabel } from './WorktreeCardHelpers'
import type { WorktreeCardPrDisplay } from './worktree-card-pr-display'
import type { IssueInfo } from '../../../../shared/github/pull-request-types'
import { translate } from '@/i18n/i18n'

// Why one quiet tone for every state but failure: a card can carry five of these at once, so
// the glyph names the state and the only hue left on the row means something actually broke.
function MetadataStatusBadge({
  label,
  children,
  alert = false
}: {
  label: string
  children: React.ReactNode
  alert?: boolean
}): React.JSX.Element {
  return (
    <Badge variant={alert ? 'cardMetadataAlert' : 'cardMetadataQuiet'}>
      {children}
      <span>{label}</span>
    </Badge>
  )
}

export function IssueStateBadge({ state }: { state: IssueInfo['state'] }): React.JSX.Element {
  if (state === 'closed') {
    return (
      <MetadataStatusBadge
        label={translate(
          'auto.components.sidebar.WorktreeCardMetadataStatusBadges.e888362def',
          'State: Closed'
        )}
      >
        <CircleCheck />
      </MetadataStatusBadge>
    )
  }

  return (
    <MetadataStatusBadge
      label={translate(
        'auto.components.sidebar.WorktreeCardMetadataStatusBadges.fe188062a1',
        'State: Open'
      )}
    >
      <CircleDot />
    </MetadataStatusBadge>
  )
}

export function LinearStateBadge({
  stateName,
  stateType
}: {
  stateName: string
  stateType?: string
}): React.JSX.Element {
  const normalized = stateName.toLowerCase()
  const done = stateType
    ? stateType === 'completed'
    : /done|closed|complete|completed|merged|resolved/.test(normalized)
  const cancelled = stateType
    ? stateType === 'canceled'
    : /cancel|canceled|duplicate|wontfix/.test(normalized)
  const active = stateType
    ? stateType === 'started'
    : /progress|doing|started|active/.test(normalized)
  const Icon = done ? CircleCheck : cancelled ? CircleX : active ? Clock : CircleDot

  return (
    <MetadataStatusBadge
      label={translate(
        'auto.components.sidebar.WorktreeCardMetadataStatusBadges.af2b07bda5',
        'State: {{value0}}',
        { value0: stateName }
      )}
    >
      <Icon />
    </MetadataStatusBadge>
  )
}

export function ReviewStateBadge({
  state,
  label
}: {
  state: WorktreeCardPrDisplay['state']
  label: 'MR' | 'PR'
}): React.JSX.Element | null {
  if (!state) {
    return null
  }

  if (state === 'merged') {
    return (
      <MetadataStatusBadge
        label={translate(
          'auto.components.sidebar.WorktreeCardMetadataStatusBadges.f394b3e86e',
          'State: Merged'
        )}
      >
        <GitMerge />
      </MetadataStatusBadge>
    )
  }

  if (state === 'closed') {
    return (
      <MetadataStatusBadge
        label={translate(
          'auto.components.sidebar.WorktreeCardMetadataStatusBadges.e888362def',
          'State: Closed'
        )}
      >
        <CircleX />
      </MetadataStatusBadge>
    )
  }

  if (state === 'draft') {
    return (
      <MetadataStatusBadge
        label={translate(
          'auto.components.sidebar.WorktreeCardMetadataStatusBadges.2931b42b09',
          'State: Draft {{value0}}',
          { value0: label }
        )}
      >
        <CircleDot />
      </MetadataStatusBadge>
    )
  }

  return (
    <MetadataStatusBadge
      label={translate(
        'auto.components.sidebar.WorktreeCardMetadataStatusBadges.fe188062a1',
        'State: Open'
      )}
    >
      {label === 'MR' ? <GitMerge /> : <PullRequestIcon />}
    </MetadataStatusBadge>
  )
}

export function ReviewChecksBadge({
  status
}: {
  status: WorktreeCardPrDisplay['status']
}): React.JSX.Element | null {
  if (!status || status === 'neutral') {
    return null
  }

  const label = `Checks: ${checksLabel(status)}`

  if (status === 'success') {
    return (
      <MetadataStatusBadge label={label}>
        <CircleCheck />
      </MetadataStatusBadge>
    )
  }

  if (status === 'failure') {
    return (
      <MetadataStatusBadge label={label} alert>
        <CircleX />
      </MetadataStatusBadge>
    )
  }

  return (
    <MetadataStatusBadge label={label}>
      <Clock />
    </MetadataStatusBadge>
  )
}
