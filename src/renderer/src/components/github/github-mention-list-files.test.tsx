// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GitHubMentionList, fileMentionOptions } from './github-mention-autocomplete'

afterEach(cleanup)

describe('GitHubMentionList with files', () => {
  it('lists workspace files by name with their file icon, the full path on hover', () => {
    render(
      <GitHubMentionList
        options={fileMentionOptions(['README.md', 'apps/frontend/package.json'])}
        activeIndex={0}
        anchor={{ left: 0, top: 400, bottom: 420 }}
        onPick={vi.fn()}
      />
    )
    const options = screen.getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(['README.md', 'package.json'])
    expect(options.map((option) => option.getAttribute('title'))).toEqual([
      'README.md',
      'apps/frontend/package.json'
    ])
    expect(options.every((option) => option.querySelector('img') !== null)).toBe(true)
  })
})
