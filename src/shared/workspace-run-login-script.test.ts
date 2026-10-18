// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { buildWorkspaceRunLoginExpression } from './workspace-run-login-script'

const CONFIG = {}
const EMAIL = 'ada@example.com'
const PASSWORD = 'correct-horse'

function isResult(value: unknown): value is { ok: boolean; reason?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    typeof value.ok === 'boolean' &&
    (!('reason' in value) || typeof value.reason === 'string')
  )
}

function run(html: string): { ok: boolean; reason?: string } {
  document.body.innerHTML = html
  const raw: unknown = window.eval(buildWorkspaceRunLoginExpression(CONFIG, EMAIL, PASSWORD))
  if (typeof raw !== 'string') {
    throw new Error('login script did not return JSON')
  }
  const parsed: unknown = JSON.parse(raw)
  if (!isResult(parsed)) {
    throw new Error('login script returned an unexpected result')
  }
  return parsed
}

function inputValue(selector: string, root: ParentNode = document): string {
  const element = root.querySelector(selector)
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`expected an input for ${selector}`)
  }
  return element.value
}

describe('workspace run login script', () => {
  it('fills the form and ignores a newsletter field outside it', () => {
    const result = run(`
      <input type="email" name="newsletter" />
      <form>
        <input type="email" name="email" />
        <input type="password" name="password" />
        <button type="submit">Sign in</button>
      </form>
    `)
    expect(result.ok).toBe(true)
    const form = document.querySelector('form')
    if (!(form instanceof HTMLFormElement)) {
      throw new Error('missing form')
    }
    expect(inputValue('input[name="email"]', form)).toBe(EMAIL)
    expect(inputValue('input[type="password"]', form)).toBe(PASSWORD)
    expect(inputValue('input[name="newsletter"]')).toBe('')
  })

  it('reports a missing password field', () => {
    expect(
      run(`<form><input type="email" /><button type="submit">Sign in</button></form>`).reason
    ).toBe('no-password-field')
  })

  it('reports a missing submit control', () => {
    expect(
      run(
        `<form><input type="email" /><input type="password" /><button type="button">Save</button></form>`
      ).reason
    ).toBe('no-submit')
  })
})
