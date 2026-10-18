// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { setPullRequestAuthors } from '../workspace-status-rules/pr-author-store'
import {
  displayedPullRequestAuthor,
  otherPullRequestAuthor,
  WorktreeCardPrAuthor
} from './worktree-card-pr-author'

const viewer = vi.hoisted(() => {
  const state: { login: string | null; settled: boolean } = {
    login: 'vitaliy',
    settled: true
  }
  return state
})

vi.mock('../pending-review/use-github-viewer', () => ({
  useGitHubViewer: () => (viewer.login ? { login: viewer.login, avatarUrl: '' } : null),
  useGitHubViewerLookupSettled: () => viewer.settled
}))

function renderAvatar(enabled: boolean, authorLogin?: string | null) {
  return render(
    <TooltipProvider>
      <WorktreeCardPrAuthor worktreeId="wt" enabled={enabled} authorLogin={authorLogin} />
    </TooltipProvider>
  )
}

const avatar = (container: HTMLElement) => container.querySelector('[data-worktree-card-pr-author]')

describe('otherPullRequestAuthor', () => {
  it("keeps someone else's login and drops the signed-in user", () => {
    expect(otherPullRequestAuthor('MadsenMM', 'vitaliy', true)).toBe('MadsenMM')
    expect(otherPullRequestAuthor('Vitaliy', 'vitaliy', true)).toBeNull()
    expect(otherPullRequestAuthor('madsenmm', null, false)).toBeNull()
    expect(otherPullRequestAuthor('madsenmm', null, true)).toBeNull()
  })

  it('reads the author carried on the cached pull request', () => {
    expect(displayedPullRequestAuthor({ author: ' madsenmm ' })).toBe('madsenmm')
    expect(displayedPullRequestAuthor(null)).toBeNull()
    expect(displayedPullRequestAuthor({})).toBeNull()
  })
})

describe('WorktreeCardPrAuthor', () => {
  afterEach(() => {
    cleanup()
    setPullRequestAuthors(new Map())
    viewer.login = 'vitaliy'
    viewer.settled = true
  })

  it('shows the author once the pull request is known to be someone else’s', () => {
    const { container } = renderAvatar(true)
    expect(avatar(container)).toBeNull()

    act(() => setPullRequestAuthors(new Map([['wt', 'madsenmm']])))
    expect(avatar(container)).toBeInTheDocument()
  })

  it('shows the author from the card when status rules never stored one', () => {
    expect(avatar(renderAvatar(true, 'madsenmm').container)).toBeInTheDocument()
  })

  it('stays hidden for the signed-in user’s own pull request', () => {
    setPullRequestAuthors(new Map([['wt', 'Vitaliy']]))
    expect(avatar(renderAvatar(true).container)).toBeNull()
    expect(avatar(renderAvatar(true, 'vitaliy').container)).toBeNull()
  })

  it('stays hidden until the signed-in login is known', () => {
    viewer.settled = false
    viewer.login = null
    setPullRequestAuthors(new Map([['wt', 'madsenmm']]))
    expect(avatar(renderAvatar(true).container)).toBeNull()
  })

  it('stays hidden while the card option is off', () => {
    setPullRequestAuthors(new Map([['wt', 'madsenmm']]))
    expect(avatar(renderAvatar(false).container)).toBeNull()
  })
})
