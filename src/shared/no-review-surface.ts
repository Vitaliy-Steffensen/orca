/** A headless server has no reviewer in front of it, so review state stays on the desktop. */
export const NO_REVIEW_SURFACE =
  'This runtime keeps no review queue. Staged review comments live on the device whose Orca app submits the review, and a headless server (orca serve) has no reviewer sitting in front of it — staging here would write where nobody looks. Stage from the device the pull request is reviewed on, or leave an agent note with `orca notes add`.'
