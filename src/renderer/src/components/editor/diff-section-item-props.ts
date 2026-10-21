import type { Dispatch, MutableRefObject, ReactNode, SetStateAction } from 'react'
import type { editor as monacoEditor } from 'monaco-editor'
import type { DecoratedDiffComment } from '../diff-comments/decorated-diff-comment'
import type { InlinePRCommentZoneHandlers } from '../diff-comments/useInlinePRCommentZones'
import type { PRCommentGroup } from '../../../../shared/pr-comment-groups'
import type { DiffSection } from './diff-section-types'

export type DiffSectionItemProps = {
  section: DiffSection
  index: number
  isBranchMode: boolean
  sideBySide: boolean
  isDark: boolean
  settings: {
    terminalFontSize?: number
    terminalFontFamily?: string
    diffWordWrap?: boolean
    diffShowWhitespace?: boolean
  } | null
  sectionHeight: number | undefined
  worktreeId?: string
  /** Where "Ask" launches its chat. Null on surfaces whose `worktreeId` names no real workspace. */
  askTarget?: { worktreeId: string } | null
  loadSection: (index: number) => void
  loadDeferredSection?: (index: number) => void
  retrySection: (index: number) => void
  toggleSection: (index: number) => void
  openSection: (index: number) => void
  openSectionTitle: string
  onOpenPreview?: (section: DiffSection, index: number) => void
  renderHeaderTrailingContent?: (section: DiffSection, index: number) => ReactNode
  onAddLineComment?: (
    section: DiffSection,
    args: { lineNumber: number; startLine?: number; body: string }
  ) => Promise<boolean>
  addLineCommentLabel?: string
  addLineCommentPlaceholder?: string
  inlineComments?: readonly DecoratedDiffComment[]
  /**
   * Staged review findings and PR threads, rendered as Monaco view zones on their own lines.
   *
   * Why its presence is the switch: the PR-page viewers pass their own read-only `inlineComments`
   * and would render each thread twice. Only the surfaces that own the worktree pass this.
   */
  reviewZones?: {
    groups: readonly PRCommentGroup[]
    handlers: InlinePRCommentZoneHandlers
  }
  getCommentableLineNumbers?: (section: DiffSection) => readonly number[] | undefined
  setSectionHeights: Dispatch<SetStateAction<Record<number, number>>>
  setSections: Dispatch<SetStateAction<DiffSection[]>>
  modifiedEditorsRef: MutableRefObject<Map<number, monacoEditor.IStandaloneCodeEditor>>
  handleSectionSaveRef: MutableRefObject<(index: number) => Promise<void>>
}
