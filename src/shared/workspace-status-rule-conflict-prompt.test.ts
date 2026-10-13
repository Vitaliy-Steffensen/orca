import { describe, expect, it } from 'vitest'
import {
  buildConflictAgentPrompt,
  DEFAULT_CONFLICT_PROMPT_TEMPLATE,
  renderConflictAgentPrompt
} from './workspace-status-rule-conflict-prompt'

describe('a customisable conflict prompt', () => {
  const variables = { baseRef: 'main', worktreePath: '/w/e-4861', prNumber: '3166' }

  it('uses the built-in prompt while no template is set', () => {
    expect(renderConflictAgentPrompt('', variables)).toBe(
      buildConflictAgentPrompt({ baseRef: 'main', worktreePath: '/w/e-4861' })
    )
    expect(renderConflictAgentPrompt('   ', variables)).toBe(
      buildConflictAgentPrompt({ baseRef: 'main', worktreePath: '/w/e-4861' })
    )
  })

  it('starts the editable template as exactly the built-in prompt', () => {
    expect(renderConflictAgentPrompt(DEFAULT_CONFLICT_PROMPT_TEMPLATE, variables)).toBe(
      buildConflictAgentPrompt({ baseRef: 'main', worktreePath: '/w/e-4861' })
    )
  })

  it('fills a custom template’s variables', () => {
    expect(
      renderConflictAgentPrompt(
        'Merge {{baseRef}} into {{worktreePath}} for #{{prNumber}}',
        variables
      )
    ).toBe('Merge main into /w/e-4861 for #3166')
  })
})

describe('buildConflictAgentPrompt', () => {
  const prompt = buildConflictAgentPrompt({ baseRef: 'main', worktreePath: '/w/e-4861' })

  it('merges the pull request base into the workspace', () => {
    expect(prompt).toContain('git fetch origin main')
    expect(prompt).toContain('/w/e-4861')
  })

  it('tells the agent to push, and never to force-push', () => {
    expect(prompt).not.toContain('Do not push')
    expect(prompt).toContain('push the branch with a plain git push')
    expect(prompt).toContain('Never force-push')
  })
})
