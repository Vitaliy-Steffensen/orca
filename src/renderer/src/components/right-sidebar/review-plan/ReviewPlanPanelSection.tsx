import React from 'react'
import { translate } from '@/i18n/i18n'
import { ReviewPlanTree } from './ReviewPlanTree'

/**
 * The review plan as a section of the PR panel, beside Checks and Pending review.
 *
 * Why it renders even with no plan: the empty state carries the Run review button, which is the
 * only way to start the pipeline from this panel.
 */
export function ReviewPlanPanelSection(): React.JSX.Element {
  return <ReviewPlanTree sectionLabel={translate('prPanelSections.reviewPlan', 'Review plan')} />
}
