import { describe, expect, it } from 'vitest'
import { buildClaudePromptReply } from './claude-structured-prompt-replies'
import type { ClaudePendingPrompt } from './claude-prompt-registry'

function planPrompt(): ClaudePendingPrompt {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: buildClaudePromptReply reads only kind, subject, input, suggestions and toolUseId.
  return {
    requestId: 'req-1',
    promptKey: 'prompt-1',
    toolUseId: 'tool-1',
    toolName: 'ExitPlanMode',
    kind: 'approval',
    subject: { kind: 'plan', text: '# Plan' },
    input: { plan: '# Plan' },
    suggestions: [],
    questionIds: [],
    settle: () => {}
  } as unknown as ClaudePendingPrompt
}

function toolPrompt(): ClaudePendingPrompt {
  const prompt = planPrompt()
  const { subject: _plan, ...rest } = prompt
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: same read set as above, with no subject.
  return { ...rest, toolName: 'Bash' } as unknown as ClaudePendingPrompt
}

describe('a denied plan', () => {
  it('keeps the standing wording when the user typed nothing', () => {
    const reply = buildClaudePromptReply(planPrompt(), { kind: 'option', optionId: 'deny' })

    expect(reply).toMatchObject({
      behavior: 'deny',
      message: 'The user asked you to keep planning. Revise the plan and call ExitPlanMode again.'
    })
  })

  it('passes the typed adjustments to the agent verbatim', () => {
    const reply = buildClaudePromptReply(planPrompt(), {
      kind: 'option',
      optionId: 'deny',
      note: 'Split step 3 in two, and leave the migration out.'
    })

    expect(reply.behavior).toBe('deny')
    // Verbatim: the text is deliberately model input, so nothing escapes or reflows it.
    expect(reply).toMatchObject({
      message:
        'The user asked you to keep planning and left this feedback:\n\nSplit step 3 in two, and leave the migration out.\n\nRevise the plan to address that feedback and call ExitPlanMode again.'
    })
  })

  it('carries a note on an ordinary tool denial too', () => {
    const reply = buildClaudePromptReply(toolPrompt(), {
      kind: 'option',
      optionId: 'deny',
      note: 'Use the bundled ripgrep.'
    })

    expect(reply).toMatchObject({
      behavior: 'deny',
      message: 'User denied this action: Use the bundled ripgrep.'
    })
  })

  it('still approves without touching the note', () => {
    const reply = buildClaudePromptReply(planPrompt(), { kind: 'option', optionId: 'allow' })

    expect(reply).toMatchObject({ behavior: 'allow' })
  })
})
