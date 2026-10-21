import React from 'react'
import { ReviewPlanTree } from './ReviewPlanTree'

/** The Review plan tab. The tree itself is shared with the PR panel's Review plan section. */
export default function ReviewPlanPanel(): React.JSX.Element {
  return <ReviewPlanTree publishOrder />
}
