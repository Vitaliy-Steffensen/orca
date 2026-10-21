import { describe, expect, it } from 'vitest'
import {
  VALIDATION_HOST_INSTRUCTION_HEADING,
  appendValidationHostInstruction
} from './agent-validation-host-instruction'
import {
  CONFLICT_PROMPT_REPLY_INSTRUCTION,
  buildResolveConflictsPrompt
} from './source-control-conflict-prompts'

const INSTRUCTION = 'Run the full suite with `flowbase testbox validate`.'

function conflictPrompt(): string {
  return buildResolveConflictsPrompt({
    conflictOperation: 'merge',
    entries: [{ path: 'src/a.ts', conflictKind: 'both_modified' }],
    worktreePath: '/tmp/wt'
  })
}

describe('appendValidationHostInstruction', () => {
  it('returns the prompt unchanged when there is no instruction', () => {
    const prompt = conflictPrompt()
    expect(appendValidationHostInstruction(prompt, undefined)).toBe(prompt)
    expect(appendValidationHostInstruction(prompt, '   ')).toBe(prompt)
  })

  it('keeps the reply contract as the final line', () => {
    const result = appendValidationHostInstruction(conflictPrompt(), INSTRUCTION)
    expect(result.endsWith(CONFLICT_PROMPT_REPLY_INSTRUCTION)).toBe(true)
    expect(result).toContain(VALIDATION_HOST_INSTRUCTION_HEADING)
    expect(result.indexOf(INSTRUCTION)).toBeLessThan(
      result.lastIndexOf(CONFLICT_PROMPT_REPLY_INSTRUCTION)
    )
  })

  it('appends to the end when the prompt has no reply contract', () => {
    const result = appendValidationHostInstruction('Do the thing.', INSTRUCTION)
    expect(result.startsWith('Do the thing.')).toBe(true)
    expect(result).toContain(INSTRUCTION)
  })

  it('does not append twice', () => {
    const once = appendValidationHostInstruction(conflictPrompt(), INSTRUCTION)
    expect(appendValidationHostInstruction(once, INSTRUCTION)).toBe(once)
  })
})
