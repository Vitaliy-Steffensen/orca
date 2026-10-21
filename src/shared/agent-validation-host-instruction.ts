import { CONFLICT_PROMPT_REPLY_INSTRUCTION } from './source-control-conflict-prompts'

export const VALIDATION_HOST_INSTRUCTION_HEADING = 'Where to run validation:'

export function appendValidationHostInstruction(
  prompt: string,
  instruction: string | undefined
): string {
  const trimmedInstruction = instruction?.trim() ?? ''
  if (!trimmedInstruction || prompt.includes(trimmedInstruction)) {
    return prompt
  }

  const block = ['', VALIDATION_HOST_INSTRUCTION_HEADING, trimmedInstruction, ''].join('\n')
  if (!prompt.endsWith(CONFLICT_PROMPT_REPLY_INSTRUCTION)) {
    return `${prompt}${block}`
  }

  // Why: the reply contract has to stay the final line, as in the commit-failure prompt.
  return `${prompt.slice(0, -CONFLICT_PROMPT_REPLY_INSTRUCTION.length)}${block}${CONFLICT_PROMPT_REPLY_INSTRUCTION}`
}
