// @vitest-environment happy-dom

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_WORKSPACE_ACTION_PROMPTS } from '../../../../shared/workspace-action-prompts'
import { SKILLS_CLI_VERSION } from '../../../../shared/agent-feature-install-commands'
import { useAppStore } from '../../store'
import { ReviewPipelinePane } from './ReviewPipelinePane'

const mocks = vi.hoisted(() => ({ coverageSkillName: '' }))

vi.mock('./AgentSkillSetupPanel', () => ({
  AgentSkillSetupPanel: (props: { title: string; command: string; footer?: ReactNode }) => {
    return (
      <section>
        <h3>{props.title}</h3>
        <code>{props.command}</code>
        {props.footer}
      </section>
    )
  }
}))

vi.mock('./OrchestrationSkillAgentCoverage', () => ({
  OrchestrationSkillAgentCoverage: (props: { skillName?: string }) => {
    mocks.coverageSkillName = props.skillName ?? ''
    return <div>Agent coverage</div>
  }
}))

vi.mock('@/hooks/useInstalledAgentSkills', () => ({
  GLOBAL_AGENT_SKILL_SOURCE_KINDS: ['home'],
  useInstalledAgentSkill: () => ({
    installed: true,
    loading: false,
    error: null,
    skills: [],
    sources: [],
    refresh: vi.fn()
  })
}))

vi.mock('@/hooks/useActiveProjectSkillRuntime', () => ({
  useActiveProjectSkillRuntime: () => ({
    installDisabledReason: null,
    canUseLocalSkillFreshness: true
  })
}))

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

async function renderPane(): Promise<HTMLDivElement> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root?.render(<ReviewPipelinePane />)
  })
  return container
}

describe('ReviewPipelinePane', () => {
  beforeEach(() => {
    useAppStore.setState({ settingsSearchQuery: '' })
  })

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount()
      })
    }
    root = null
    container?.remove()
    container = null
    mocks.coverageSkillName = ''
  })

  it('offers the review skill install and reports coverage for that skill', async () => {
    const pane = await renderPane()

    expect(pane.textContent).toContain('Review skill')
    expect(pane.textContent).toContain('Agent coverage')
    expect(pane.textContent).toContain(`npx skills@${SKILLS_CLI_VERSION} add`)
    expect(pane.textContent).toContain('--skill orca-review')
    expect(mocks.coverageSkillName).toBe('orca-review')
  })

  it('shows the built-in review prompt in an untouched box', async () => {
    const pane = await renderPane()
    const textarea = pane.querySelector('textarea')

    expect(pane.textContent).toContain('Review prompt')
    expect(textarea?.value).toBe(DEFAULT_WORKSPACE_ACTION_PROMPTS.reviewPipeline)
  })

  it('drops out of the page when the settings search matches nothing in it', async () => {
    useAppStore.setState({ settingsSearchQuery: 'bluetooth pairing' })
    const pane = await renderPane()

    expect(pane.textContent).not.toContain('Review skill')
  })
})
