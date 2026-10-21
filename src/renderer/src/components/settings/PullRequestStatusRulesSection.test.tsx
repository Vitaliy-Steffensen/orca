// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cloneDefaultWorkspaceStatusRuleConfig,
  type WorkspaceStatusRuleConfig
} from '../../../../shared/workspace-status-rule-config'

const mocks = vi.hoisted(() => ({
  config: null as WorkspaceStatusRuleConfig | null,
  setWorkspaceStatusRules: vi.fn(),
  setWorkspaceStatuses: vi.fn(),
  openAutomationsPage: vi.fn()
}))

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string) => fallback
}))
vi.mock('@/store', () => ({
  useAppStore: (selector: (state: unknown) => unknown) =>
    selector({
      workspaceStatusRules: mocks.config,
      workspaceStatuses: [
        { id: 'automations', label: 'Automations' },
        { id: 'review', label: 'Review' }
      ],
      repos: [],
      setWorkspaceStatusRules: mocks.setWorkspaceStatusRules,
      setWorkspaceStatuses: mocks.setWorkspaceStatuses,
      openAutomationsPage: mocks.openAutomationsPage
    })
}))
vi.mock('./WorkspaceActionPromptsSection', () => ({
  WorkspaceActionPromptsSection: () => null
}))

import { PullRequestStatusRulesSection } from './PullRequestStatusRulesSection'

describe('PR rules settings', () => {
  beforeEach(() => {
    mocks.config = cloneDefaultWorkspaceStatusRuleConfig()
    mocks.setWorkspaceStatusRules.mockReset()
    mocks.setWorkspaceStatuses.mockReset()
    mocks.openAutomationsPage.mockReset()
  })

  afterEach(cleanup)

  it('opens on General, with a tab for every pull request state', () => {
    render(<PullRequestStatusRulesSection />)

    expect(screen.getByText('Scheduled by the Pull request sync automation')).toBeInTheDocument()
    expect(screen.getByText('New workspaces start in')).toBeInTheDocument()
    for (const tab of ['Reviewing', 'Conflicts', 'Review', 'Merge gate', 'PM approval']) {
      expect(screen.getByRole('tab', { name: tab })).toBeInTheDocument()
    }
    expect(screen.queryByText('Resolve conflicts with an agent')).toBeNull()
  })

  it('shows a state’s own settings on its tab, beside its column', async () => {
    render(<PullRequestStatusRulesSection />)

    await userEvent.click(screen.getByRole('tab', { name: 'Conflicts' }))

    expect(screen.getByText('Has merge conflicts')).toBeInTheDocument()
    expect(screen.getByText('Resolve conflicts with an agent')).toBeInTheDocument()
    expect(screen.queryByText('New workspaces start in')).toBeNull()
    expect(screen.queryByText('Prompt for a first review')).toBeNull()
  })

  it('lets the conflict agent’s prompt be edited, starting from the built-in one', async () => {
    mocks.config = { ...mocks.config!, resolveConflictsWithAgent: true }
    render(<PullRequestStatusRulesSection />)

    await userEvent.click(screen.getByRole('tab', { name: 'Conflicts' }))
    const box = screen.getByRole('textbox', { name: 'Conflict prompt' })
    expect((box as HTMLTextAreaElement).value).toContain('Resolve the merge conflicts')

    await userEvent.clear(box)
    await userEvent.type(box, 'Merge it')

    expect(mocks.setWorkspaceStatusRules).toHaveBeenLastCalledWith(
      expect.objectContaining({ conflictPromptTemplate: expect.stringContaining('t') })
    )
  })

  it('makes the picked holding column hold, on the board as well as in the rules', async () => {
    render(<PullRequestStatusRulesSection />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Automation runs wait in' }))
    await userEvent.click(screen.getByRole('option', { name: 'Automations' }))

    expect(mocks.setWorkspaceStatusRules).toHaveBeenCalledWith(
      expect.objectContaining({ automationStartStatus: 'automations' })
    )
    expect(mocks.setWorkspaceStatuses).toHaveBeenCalledWith([
      { id: 'automations', label: 'Automations', holdsAutomation: true },
      { id: 'review', label: 'Review' }
    ])
  })

  it('lets the reviewing view be picked', async () => {
    mocks.config = {
      ...mocks.config!,
      reviewInbox: { ...mocks.config!.reviewInbox, enabled: true }
    }
    render(<PullRequestStatusRulesSection />)

    await userEvent.click(screen.getByRole('tab', { name: 'Reviewing' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Terminal' }))

    expect(mocks.setWorkspaceStatusRules).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewInbox: expect.objectContaining({ view: 'terminal' })
      })
    )
  })
})
