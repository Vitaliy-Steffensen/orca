/** A code selection the user asked about, and the point on screen the question is drawn at. */
export type SelectionAskRequest = {
  worktreeId: string
  relativePath: string
  language: string
  startLine: number
  endLine: number
  selectedText: string
  /** Viewport coordinates of the toolbar, captured at click time. */
  anchorRect: { top: number; left: number; width: number; height: number }
}
