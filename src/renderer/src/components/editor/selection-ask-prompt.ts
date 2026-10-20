import { promptForWorkspaceMode } from '../../../../shared/workspace-mode-prompts'
import {
  normalizeNativeChatPromptMarks,
  SIMPLIFY_PROMPT_MARK_ID,
  type NativeChatPromptMark
} from '../../../../shared/native-chat-prompt-marks'
import { formatSelectionContextBlock, type SelectionContextBlockArgs } from './selection-copy'

export type SelectionAskPromptArgs = SelectionContextBlockArgs & {
  question: string
  simplifyMark?: NativeChatPromptMark | null
}

/** The user's Simplify mark, or none when they deleted it from their marks. */
export function resolveSimplifyPromptMark(
  nativeChatPromptMarks: unknown
): NativeChatPromptMark | undefined {
  return normalizeNativeChatPromptMarks(nativeChatPromptMarks).find(
    (mark) => mark.id === SIMPLIFY_PROMPT_MARK_ID
  )
}

export function buildSelectionAskPrompt({
  question,
  simplifyMark,
  ...context
}: SelectionAskPromptArgs): string {
  return promptForWorkspaceMode(
    'ask',
    [question, '', formatSelectionContextBlock(context)].join('\n'),
    simplifyMark
  )
}

/** The chat tab's label: `Ask · DiffViewer.tsx:140-158`. */
export function selectionAskTabLabel(args: {
  relativePath: string
  startLine: number
  endLine: number
}): string {
  const fileName = args.relativePath.split(/[\\/]/).pop() || args.relativePath
  const lines =
    args.startLine === args.endLine ? `${args.startLine}` : `${args.startLine}-${args.endLine}`
  return `Ask · ${fileName}:${lines}`
}
