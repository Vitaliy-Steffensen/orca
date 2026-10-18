import { describe, expect, it } from 'vitest'
import { promptForWorkspaceMode } from './workspace-mode-prompts'
import { defaultNativeChatPromptMarks } from './native-chat-prompt-marks'

describe('mode prompts', () => {
  it('uses the customized Simplify mark, including its placement', () => {
    const mark = defaultNativeChatPromptMarks()[0]
    expect(mark).toBeDefined()
    expect(promptForWorkspaceMode('ask', 'Explain it', mark)).toContain(mark!.prompt)
    expect(
      promptForWorkspaceMode('ask', 'Explain it', {
        id: 'simplify',
        name: 'Simplify',
        prompt: 'Custom instruction',
        placement: 'suffix'
      })
    ).toBe('Explain it\n\nCustom instruction')
    expect(promptForWorkspaceMode('ask', 'Explain it', null)).toBe('Explain it')
  })
  it.each(['ask', 'supervised', 'autonomous'] as const)(
    'preserves commands, links and blank drafts in %s',
    (mode) => {
      for (const prompt of ['/review changes', 'https://github.com/org/repo/issues/1', '']) {
        expect(promptForWorkspaceMode(mode, prompt, defaultNativeChatPromptMarks()[0])).toBe(prompt)
      }
    }
  )
  it('asks supervised work to stop and autonomous work to stop only on scope growth or blockers', () => {
    expect(promptForWorkspaceMode('supervised', 'Fix the bug')).toContain(
      'stop before writing anything'
    )
    expect(promptForWorkspaceMode('autonomous', 'Fix the bug')).toContain('materially bigger')
    expect(promptForWorkspaceMode('autonomous', 'Fix the bug')).toContain('Fix the bug')
  })
})
