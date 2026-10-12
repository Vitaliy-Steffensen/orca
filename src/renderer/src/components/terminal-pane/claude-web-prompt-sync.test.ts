import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CLAUDE_WEB_PROMPT_CHECK_DELAY_MS,
  noteClaudePromptDelivered,
  promptShownInPage,
  takeDeliveredClaudePrompt,
  verifyClaudeWebPromptShown,
  watchClaudeWebPromptSync
} from './claude-web-prompt-sync'

afterEach(() => {
  takeDeliveredClaudePrompt('tab-1')
})

describe('promptShownInPage', () => {
  it("finds the prompt's opening line in the page however the page lays it out", () => {
    const prompt = 'Fix the **failing** test in `scope.py`\n\nThen run the suite.'
    expect(promptShownInPage(prompt, 'You\nFix the failing\n test in scope.py\nThen run')).toBe(
      true
    )
    expect(promptShownInPage(prompt, 'Claude is working…')).toBe(false)
  })
})

describe('delivered Claude prompts', () => {
  it("are kept per tab until that tab's web view checks them", () => {
    noteClaudePromptDelivered('tab-1', 'Do the thing')
    expect(takeDeliveredClaudePrompt('tab-2')).toBeNull()
    expect(takeDeliveredClaudePrompt('tab-1')).toMatchObject({ prompt: 'Do the thing' })
    expect(takeDeliveredClaudePrompt('tab-1')).toBeNull()
  })
})

describe('watchClaudeWebPromptSync', () => {
  afterEach(() => vi.useRealTimers())

  it('checks a delivered prompt a few seconds later, once the page has loaded', async () => {
    vi.useFakeTimers()
    const reload = vi.fn()
    const watcher = watchClaudeWebPromptSync({
      tabId: 'tab-1',
      readPageText: async () => 'Claude is working…',
      reload
    })
    noteClaudePromptDelivered('tab-1', 'Do the thing')
    await vi.advanceTimersByTimeAsync(CLAUDE_WEB_PROMPT_CHECK_DELAY_MS + 100)
    expect(reload).not.toHaveBeenCalled()

    watcher.pageReady()
    await vi.advanceTimersByTimeAsync(0)
    expect(reload).toHaveBeenCalledOnce()
    watcher.dispose()
  })

  it("ignores other tabs' prompts and stops once disposed", async () => {
    vi.useFakeTimers()
    const reload = vi.fn()
    const watcher = watchClaudeWebPromptSync({
      tabId: 'tab-1',
      readPageText: async () => '',
      reload
    })
    watcher.pageReady()
    noteClaudePromptDelivered('tab-2', 'Elsewhere')
    await vi.advanceTimersByTimeAsync(CLAUDE_WEB_PROMPT_CHECK_DELAY_MS + 100)
    expect(reload).not.toHaveBeenCalled()

    noteClaudePromptDelivered('tab-1', 'Do the thing')
    watcher.dispose()
    await vi.advanceTimersByTimeAsync(CLAUDE_WEB_PROMPT_CHECK_DELAY_MS + 100)
    expect(reload).not.toHaveBeenCalled()
    takeDeliveredClaudePrompt('tab-2')
  })
})

describe('verifyClaudeWebPromptShown', () => {
  it('reloads the page once when the delivered prompt never showed up there', async () => {
    const reload = vi.fn()
    await expect(
      verifyClaudeWebPromptShown({
        prompt: 'Do the thing',
        readPageText: async () => 'Claude is working…',
        reload
      })
    ).resolves.toBe('reloaded')
    expect(reload).toHaveBeenCalledOnce()
  })

  it('leaves the page alone when the prompt is there', async () => {
    const reload = vi.fn()
    await expect(
      verifyClaudeWebPromptShown({
        prompt: 'Do the thing',
        readPageText: async () => 'You: Do the thing',
        reload
      })
    ).resolves.toBe('shown')
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads when the page cannot be read, the safe way back into sync', async () => {
    const reload = vi.fn()
    await expect(
      verifyClaudeWebPromptShown({
        prompt: 'Do the thing',
        readPageText: async () => {
          throw new Error('guest gone')
        },
        reload
      })
    ).resolves.toBe('reloaded')
    expect(reload).toHaveBeenCalledOnce()
  })
})
