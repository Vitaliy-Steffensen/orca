// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GitHubMentionList, fileMentionOptions } from './github-mention-autocomplete'

afterEach(cleanup)

describe('GitHubMentionList with files', () => {
  it('lists workspace files by path, without a user avatar', () => {
    render(
      <GitHubMentionList
        options={fileMentionOptions(['CLAUDE.md', 'apps/frontend/CLAUDE.md'])}
        activeIndex={0}
        anchor={{ left: 0, top: 400, bottom: 420 }}
        onPick={vi.fn()}
      />
    )
    const options = screen.getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      '@CLAUDE.md',
      '@apps/frontend/CLAUDE.md'
    ])
    expect(document.querySelector('[role="listbox"] img')).toBeNull()
  })
})
