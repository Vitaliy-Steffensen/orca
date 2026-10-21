import React from 'react'
import { SegmentedTabs } from '@/components/ui/segmented-tabs'
import { translate } from '@/i18n/i18n'
import type { ReviewDiffBase } from '@/components/pending-review/use-review-diff-base'

export function PendingReviewDiffBaseToggle({
  value,
  onChange,
  latestReviewOrdinal,
  sinceReviewDisabled
}: {
  value: ReviewDiffBase
  onChange: (next: ReviewDiffBase) => void
  latestReviewOrdinal: number
  sinceReviewDisabled: boolean
}): React.JSX.Element {
  return (
    <SegmentedTabs<ReviewDiffBase>
      fullWidth
      ariaLabel={translate(
        'auto.components.sourceControl.pendingReview.diffBaseToggleLabel',
        'Show the full pull request or only what changed since your last review'
      )}
      value={value}
      onChange={onChange}
      options={[
        {
          id: 'whole',
          label: translate('auto.components.sourceControl.pendingReview.fullPr', 'Full PR')
        },
        {
          id: 'since-review',
          label: translate(
            'auto.components.sourceControl.pendingReview.sinceLastReviewShort',
            'Since review {{n}}',
            { n: latestReviewOrdinal }
          ),
          disabledReason: sinceReviewDisabled
            ? translate(
                'auto.components.sourceControl.pendingReview.sinceReviewMissing',
                'The commit you last reviewed is no longer in this repository'
              )
            : undefined
        }
      ]}
    />
  )
}
