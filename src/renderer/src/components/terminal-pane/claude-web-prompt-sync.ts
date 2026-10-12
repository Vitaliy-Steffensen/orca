// Fork: Orca hands prompts to Claude Code through its terminal, and claude.ai's live view of the
// session does not always pick a locally typed message up; it shows the agent working without the
// prompt until a reload. Each delivered prompt is noted for its tab's Claude web view, which
// checks the page and reloads it once when the prompt is missing.

export const CLAUDE_WEB_PROMPT_CHECK_DELAY_MS = 4000

const SNIPPET_LENGTH = 48

export type DeliveredClaudePrompt = { prompt: string; deliveredAt: number }

const deliveredByTab = new Map<string, DeliveredClaudePrompt>()
const listeners = new Set<(tabId: string) => void>()

export function noteClaudePromptDelivered(tabId: string, prompt: string): void {
  if (!prompt.trim()) {
    return
  }
  deliveredByTab.set(tabId, { prompt, deliveredAt: Date.now() })
  for (const listener of listeners) {
    listener(tabId)
  }
}

export function takeDeliveredClaudePrompt(tabId: string): DeliveredClaudePrompt | null {
  const delivered = deliveredByTab.get(tabId) ?? null
  deliveredByTab.delete(tabId)
  return delivered
}

export function onClaudePromptDelivered(listener: (tabId: string) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Why letters and digits only: the page renders the prompt as markdown, so its punctuation and
// line breaks differ from what was typed.
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

export function promptShownInPage(prompt: string, pageText: string): boolean {
  const firstLine = prompt.split('\n').find((line) => normalize(line).length > 0) ?? ''
  const snippet = normalize(firstLine).slice(0, SNIPPET_LENGTH)
  return snippet.length === 0 || normalize(pageText).includes(snippet)
}

/** One per Claude web view: checks its tab's delivered prompt once the page is ready and the delay has passed. */
export function watchClaudeWebPromptSync({
  tabId,
  readPageText,
  reload
}: {
  tabId: string
  readPageText: () => Promise<string>
  reload: () => void
}): { pageReady: () => void; dispose: () => void } {
  let ready = false
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const check = (): void => {
    timer = null
    const delivered = takeDeliveredClaudePrompt(tabId)
    if (delivered && !disposed) {
      void verifyClaudeWebPromptShown({ prompt: delivered.prompt, readPageText, reload })
    }
  }
  const schedule = (): void => {
    const delivered = deliveredByTab.get(tabId)
    if (!ready || disposed || !delivered) {
      return
    }
    if (timer) {
      clearTimeout(timer)
    }
    const wait = delivered.deliveredAt + CLAUDE_WEB_PROMPT_CHECK_DELAY_MS - Date.now()
    timer = setTimeout(check, Math.max(0, wait))
  }
  const unsubscribe = onClaudePromptDelivered((deliveredTabId) => {
    if (deliveredTabId === tabId) {
      schedule()
    }
  })
  return {
    pageReady: () => {
      ready = true
      schedule()
    },
    dispose: () => {
      disposed = true
      unsubscribe()
      if (timer) {
        clearTimeout(timer)
      }
    }
  }
}

export async function verifyClaudeWebPromptShown({
  prompt,
  readPageText,
  reload
}: {
  prompt: string
  readPageText: () => Promise<string>
  reload: () => void
}): Promise<'shown' | 'reloaded'> {
  let pageText: string | null = null
  try {
    pageText = await readPageText()
  } catch {
    pageText = null
  }
  if (pageText !== null && promptShownInPage(prompt, pageText)) {
    return 'shown'
  }
  reload()
  return 'reloaded'
}
