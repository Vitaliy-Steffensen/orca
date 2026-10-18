import { describe, expect, it } from 'vitest'
import { AcpRpcError } from '../acp-errors'
import { acpLaunchSpecFor } from '../acp-launch-specs'
import { AcpTimelineTranslator } from '../acp-timeline-translator'
import { CURSOR_ACP_DIALECT } from './cursor-dialect'

const QUESTION = {
  toolCallId: 'ask-1',
  title: 'Pick one',
  questions: [
    {
      id: 'q-tests',
      prompt: 'Which tests?',
      options: [
        { id: 'unit', label: 'Unit' },
        { id: 'all', label: 'All' }
      ]
    }
  ]
}

function translator(): AcpTimelineTranslator {
  return new AcpTimelineTranslator({ sessionId: 'provider-1', dialect: CURSOR_ACP_DIALECT })
}

describe('Cursor ACP dialect', () => {
  it('launches cursor-agent acp and signs in with cursor_login', () => {
    const spec = acpLaunchSpecFor('cursor')
    expect(spec?.command).toBe('cursor-agent')
    expect(spec?.args({ fullAccess: false, pluginDir: null })).toEqual([
      '--disable-auto-update',
      'acp'
    ])
    expect(spec?.args({ fullAccess: true, pluginDir: null })).toEqual([
      '--disable-auto-update',
      '--force',
      'acp'
    ])
    expect(spec?.authMethod?.({ advertised: ['cursor_login'], env: {} })).toBe('cursor_login')
    expect(spec?.authMethod?.({ advertised: [], env: { CURSOR_API_KEY: 'key' } })).toBeUndefined()
    expect(spec?.loginCommand).toEqual(['cursor-agent', 'login'])
  })

  it('shows a question that names no session and answers with Cursor ids', () => {
    const request = translator().request('cursor/ask_question', QUESTION, 4)
    expect(request.presentation?.body).toMatchObject({
      kind: 'question',
      question: 'Pick one',
      questions: [{ id: 'q-tests', options: [{ id: 'unit' }, { id: 'all' }] }]
    })
    expect(request.presentation?.reply({ kind: 'option', optionId: 'unit' })).toEqual({
      outcome: {
        outcome: 'answered',
        answers: [{ questionId: 'q-tests', selectedOptionIds: ['unit'] }]
      }
    })
    expect(request.presentation?.reply(null)).toEqual({ outcome: { outcome: 'cancelled' } })
  })

  it('shows a plan approval and accepts or rejects it', () => {
    const request = translator().request(
      'cursor/create_plan',
      {
        name: 'Ship',
        overview: 'Release',
        plan: '# Ship\n\nRun tests',
        todos: [{ content: 'Run tests' }]
      },
      5
    )
    expect(request.presentation?.body).toMatchObject({
      kind: 'approval',
      title: 'Ship',
      detail: 'Release',
      subject: { kind: 'plan', text: '# Ship\n\nRun tests\n\n- Run tests' }
    })
    expect(request.presentation?.reply({ kind: 'option', optionId: 'accept' })).toEqual({
      outcome: { outcome: 'accepted' }
    })
    expect(
      request.presentation?.reply({ kind: 'option', optionId: 'reject', note: 'Not yet' })
    ).toEqual({ outcome: { outcome: 'rejected', reason: 'Not yet' } })
  })

  it('still refuses a question aimed at another session', () => {
    expect(() =>
      translator().request('cursor/ask_question', { ...QUESTION, sessionId: 'other' }, 6)
    ).toThrow(AcpRpcError)
    expect(() => translator().request('cursor/task', { toolCallId: 'task-1' }, 7)).toThrow(
      'unknown session'
    )
  })
})
