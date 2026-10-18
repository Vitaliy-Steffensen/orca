import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import {
  WORKTREE_CARD_CHIP_LIMIT,
  type WorktreeCardChip,
  type WorktreeCardChipTone
} from './worktree-card-chips'

// Why a static map: the Badge primitive owns chip styling, so a tone picks a variant
// rather than layering classes on top of it.
const TONE_VARIANT: Record<
  WorktreeCardChipTone,
  'cardChipAlert' | 'cardChipWarn' | 'cardChipQuiet'
> = {
  destructive: 'cardChipAlert',
  warning: 'cardChipWarn',
  muted: 'cardChipQuiet'
}

function WorktreeCardChipBadge({ chip }: { chip: WorktreeCardChip }): React.JSX.Element {
  const Icon = chip.icon
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={TONE_VARIANT[chip.tone]} data-worktree-card-chip={chip.id}>
          <Icon className="size-2.5" />
          {chip.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {chip.tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * The card's exception rail: at most {@link WORKTREE_CARD_CHIP_LIMIT} chips, each shown only
 * when it has something abnormal to say. A healthy workspace renders nothing here, so every
 * chip that does appear is worth reading. Overflow collapses into a count whose detail lives
 * in the card's details hover.
 */
export function WorktreeCardChipRail({
  chips
}: {
  chips: readonly WorktreeCardChip[]
}): React.JSX.Element | null {
  if (chips.length === 0) {
    return null
  }
  const visible = chips.slice(0, WORKTREE_CARD_CHIP_LIMIT)
  const overflow = chips.length - visible.length

  return (
    <div className="flex shrink-0 items-center gap-1" data-worktree-card-chip-rail="">
      {visible.map((chip) => (
        <WorktreeCardChipBadge key={chip.id} chip={chip} />
      ))}
      {overflow > 0 && (
        <Badge variant="cardChipQuiet" data-worktree-card-chip-overflow="">
          {translate('auto.components.sidebar.worktreeCardChips.overflow', '+{{value0}}', {
            value0: String(overflow)
          })}
        </Badge>
      )}
    </div>
  )
}
