import { describe, expect, it } from 'vitest'
import {
  SIMPLIFY_PROMPT_MARK_PROMPT,
  defaultNativeChatPromptMarks
} from '../../../../shared/native-chat-prompt-marks'
import {
  buildSelectionAskPrompt,
  resolveSimplifyPromptMark,
  selectionAskTabLabel
} from './selection-ask-prompt'

const SELECTION = {
  relativePath: 'src/renderer/src/components/editor/DiffViewer.tsx',
  language: 'typescript',
  startLine: 140,
  endLine: 158,
  selectedText: 'const askTarget = worktreeId ? { worktreeId } : null'
}

describe('buildSelectionAskPrompt', () => {
  it('wraps the question and the selection context in the Simplify mark', () => {
    const prompt = buildSelectionAskPrompt({
      ...SELECTION,
      question: 'What does this guard protect against?',
      simplifyMark: resolveSimplifyPromptMark(defaultNativeChatPromptMarks())
    })

    expect(prompt).toContain(SIMPLIFY_PROMPT_MARK_PROMPT)
    expect(prompt).toContain('What does this guard protect against?')
    expect(prompt).toContain('File: src/renderer/src/components/editor/DiffViewer.tsx')
    expect(prompt).toContain('Lines: 140-158')
    expect(prompt).toContain('```ts\nconst askTarget = worktreeId ? { worktreeId } : null\n```')
  })

  it('leaves a question that is itself a slash command untouched', () => {
    const prompt = buildSelectionAskPrompt({
      ...SELECTION,
      question: '/review',
      simplifyMark: resolveSimplifyPromptMark(defaultNativeChatPromptMarks())
    })

    expect(prompt.startsWith('/review')).toBe(true)
    expect(prompt).not.toContain(SIMPLIFY_PROMPT_MARK_PROMPT)
  })

  it('asks without a mark when the user deleted Simplify from their marks', () => {
    const prompt = buildSelectionAskPrompt({
      ...SELECTION,
      question: 'Why?',
      simplifyMark: resolveSimplifyPromptMark([])
    })

    expect(prompt).not.toContain(SIMPLIFY_PROMPT_MARK_PROMPT)
    expect(prompt).toContain('Lines: 140-158')
  })
})

describe('selectionAskTabLabel', () => {
  it('names the file and the line range', () => {
    expect(selectionAskTabLabel(SELECTION)).toBe('Ask · DiffViewer.tsx:140-158')
  })

  it('names a single line without a range', () => {
    expect(selectionAskTabLabel({ relativePath: 'a/b/status.ts', startLine: 7, endLine: 7 })).toBe(
      'Ask · status.ts:7'
    )
  })
})
