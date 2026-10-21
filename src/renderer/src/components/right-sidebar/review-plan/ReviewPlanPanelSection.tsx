import React from 'react'
import { translate } from '@/i18n/i18n'
import { ReviewPlanTree } from './ReviewPlanTree'

/**
 * The review plan as a section of the PR panel, beside Checks and Pending review.
 *
 * Why it renders even with no plan: the empty state says where the plan comes from, so the section
 * does not simply vanish before a review has run.
 */
export function ReviewPlanPanelSection(): React.JSX.Element {
  return <ReviewPlanTree sectionLabel={translate('prPanelSections.reviewPlan', 'Review plan')} />
}
