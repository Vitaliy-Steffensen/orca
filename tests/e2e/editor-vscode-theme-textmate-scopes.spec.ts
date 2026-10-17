import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { test, expect } from './helpers/orca-app'
import { getActiveWorktreeContext } from './helpers/markdown-editor-fixture'
import { waitForSessionReady } from './helpers/store'

const CONTROL_KEYWORD_COLOR = 'rgb(197, 134, 192)'
const OTHER_KEYWORD_COLOR = 'rgb(86, 156, 214)'

// Why a hand-written theme instead of a real one: this asserts that a scope a VS Code theme names
// reaches the editor, which needs two distinguishable colours, not anyone's palette.
const THEME = {
  name: 'scope-probe',
  type: 'dark',
  colors: { 'editor.background': '#1e1e1e', 'editor.foreground': '#d4d4d4' },
  tokenColors: [
    { scope: 'keyword', settings: { foreground: '#569cd6' } },
    { scope: 'keyword.control', settings: { foreground: '#c586c0' } },
    { scope: 'storage.type', settings: { foreground: '#569cd6' } }
  ]
}

const PYTHON_SOURCE = `from typing import Self


def pick(value):
    return value
`

async function colorOfWord(
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: narrowed to the one Playwright Page member this helper uses.
  page: Parameters<typeof waitForSessionReady>[0],
  word: string
): Promise<string> {
  const span = page.locator('.monaco-editor .view-line span span', { hasText: word }).first()
  await expect(span).toHaveText(word, { timeout: 30_000 })
  return span.evaluate((node) => getComputedStyle(node).color)
}

test('a VS Code theme colours control keywords apart from other keywords', async ({
  orcaPage,
  electronApp,
  registerPostElectronShutdownCleanup
}) => {
  await waitForSessionReady(orcaPage)

  // Why read it from the app: the suite isolates HOME, and the theme loader reads the home
  // Electron itself resolved, not the developer's.
  const home = await electronApp.evaluate(({ app }) => app.getPath('home'))
  const themeDirectory = path.join(home, '.orca', 'themes')
  await mkdir(themeDirectory, { recursive: true })
  await writeFile(path.join(themeDirectory, 'editor-dark.json'), JSON.stringify(THEME), 'utf8')

  const context = await getActiveWorktreeContext(orcaPage)
  const filePath = path.join(context.rootPath, `theme-scope-probe-${Date.now()}.py`)
  await writeFile(filePath, PYTHON_SOURCE, 'utf8')
  registerPostElectronShutdownCleanup(async () => rm(filePath, { force: true }))

  await orcaPage.evaluate(
    async ({ filePath, relativePath, worktreeId }) => {
      const store = window.__store
      if (!store) {
        throw new Error('window.__store is not available')
      }
      await store.getState().updateSettingsOrThrow({ theme: 'dark' })
      store.getState().openFile({
        filePath,
        relativePath,
        worktreeId,
        language: 'python',
        mode: 'edit'
      })
    },
    { filePath, relativePath: path.basename(filePath), worktreeId: context.worktreeId }
  )

  // Why these two words: Monaco's Monarch tokenizer paints every Python keyword with one flat
  // `keyword` token, so before TextMate tokenization both came out the same colour.
  expect(await colorOfWord(orcaPage, 'from')).toBe(CONTROL_KEYWORD_COLOR)
  expect(await colorOfWord(orcaPage, 'def')).toBe(OTHER_KEYWORD_COLOR)
})
