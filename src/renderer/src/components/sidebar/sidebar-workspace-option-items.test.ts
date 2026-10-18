import { describe, expect, it } from 'vitest'
import { getWorktreeCardPropertyOptions } from './sidebar-workspace-option-items'

describe('worktree card property options', () => {
  it('splits issue providers into their own options', () => {
    const options = getWorktreeCardPropertyOptions()

    expect(options.map((option) => option.id)).not.toContain('tasks')
    expect(options.map((option) => option.id)).not.toContain('status')
    expect(options.find((option) => option.id === 'issue')?.properties).toEqual(['issue'])
    expect(options.find((option) => option.id === 'linear-issue')?.properties).toEqual([
      'linear-issue'
    ])
    expect(options.find((option) => option.id === 'jira-issue')?.properties).toEqual(['jira-issue'])
    expect(options.find((option) => option.id === 'automation')?.properties).toEqual(['automation'])
    expect(options.map((option) => option.label)).toContain('Automation')
  })

  it('uses branch-only copy without project groups', () => {
    const options = getWorktreeCardPropertyOptions({ hasProjectGroups: false })

    expect(options.find((option) => option.id === 'branch')?.label).toBe('Branch name')
  })

  it('mentions folder paths with project groups', () => {
    const options = getWorktreeCardPropertyOptions({ hasProjectGroups: true })

    expect(options.find((option) => option.id === 'branch')?.label).toBe('Branch / folder path')
  })
})
