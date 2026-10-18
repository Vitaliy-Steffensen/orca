import { z } from 'zod'
import {
  isValidAgentSessionQuestionAnswers,
  legacyAgentSessionQuestionAnswers
} from '../../../shared/agent-session-question-answer'
import { AcpRpcError } from '../acp-errors'
import { pendingAcpResolution } from '../acp-timeline-requests'
import type { AcpRequestPresentation } from './acp-dialect'

const questionRequestSchema = z.object({
  toolCallId: z.string().optional(),
  title: z.string().optional(),
  questions: z
    .array(
      z.object({
        id: z.string().min(1),
        prompt: z.string(),
        allowMultiple: z.boolean().optional(),
        options: z.array(z.object({ id: z.string().min(1), label: z.string() })).min(1)
      })
    )
    .min(1)
})

const planTodoSchema = z.object({
  id: z.string().optional(),
  content: z.string().optional(),
  status: z.string().optional()
})

const planRequestSchema = z.object({
  toolCallId: z.string().optional(),
  name: z.string().optional(),
  overview: z.string().optional(),
  plan: z.string().optional(),
  todos: z.array(planTodoSchema).optional()
})

function questionRequest(params: unknown): AcpRequestPresentation {
  const parsed = questionRequestSchema.safeParse(params)
  if (!parsed.success) {
    throw new AcpRpcError(-32602, 'Invalid Cursor question request')
  }
  const questions = parsed.data.questions.map((question) => ({
    id: question.id,
    question: question.prompt,
    multiSelect: question.allowMultiple === true,
    options: question.options.map((option) => ({ id: option.id, label: option.label }))
  }))
  const first = questions[0]!
  const body = {
    kind: 'question' as const,
    question: parsed.data.title?.trim() || first.question,
    options: first.options,
    questions,
    resolution: pendingAcpResolution
  }
  return {
    body,
    reply: (response) => {
      if (response === null) {
        return { outcome: { outcome: 'cancelled' } }
      }
      const answers =
        response.kind === 'answers'
          ? response.answers
          : legacyAgentSessionQuestionAnswers(body, response.optionId)
      if (!answers || !isValidAgentSessionQuestionAnswers(questions, answers)) {
        throw new AcpRpcError(-32602, 'Question answer must answer every offered question')
      }
      return {
        outcome: {
          outcome: 'answered',
          answers: answers.map((answer) => ({
            questionId: answer.questionId,
            selectedOptionIds: answer.optionIds
          }))
        }
      }
    }
  }
}

function planText(plan: string | undefined, todos: { content?: string }[] | undefined): string {
  const body = plan?.trim() ?? ''
  const items = (todos ?? [])
    .map((todo) => todo.content?.trim())
    .filter((content): content is string => Boolean(content))
    .map((content) => `- ${content}`)
  return [body, items.join('\n')].filter((part) => part.length > 0).join('\n\n')
}

function planRequest(params: unknown): AcpRequestPresentation {
  const parsed = planRequestSchema.safeParse(params)
  if (!parsed.success) {
    throw new AcpRpcError(-32602, 'Invalid Cursor plan request')
  }
  const text = planText(parsed.data.plan, parsed.data.todos)
  const overview = parsed.data.overview?.trim()
  return {
    body: {
      kind: 'approval',
      title: parsed.data.name?.trim() || 'Plan',
      detail: overview && overview.length > 0 ? overview : null,
      subject: { kind: 'plan', text: text.length > 0 ? text : 'The agent did not write a plan.' },
      options: [
        { id: 'accept', label: 'Accept' },
        { id: 'reject', label: 'Reject' }
      ],
      resolution: pendingAcpResolution
    },
    reply: (response) => {
      if (response === null) {
        return { outcome: { outcome: 'cancelled' } }
      }
      if (response.kind !== 'option') {
        throw new AcpRpcError(-32602, 'Plan answer must accept or reject')
      }
      if (response.optionId === 'accept') {
        return { outcome: { outcome: 'accepted' } }
      }
      if (response.optionId === 'reject') {
        const reason = response.note?.trim()
        return {
          outcome: {
            outcome: 'rejected',
            ...(reason ? { reason } : {})
          }
        }
      }
      throw new AcpRpcError(-32602, 'Plan answer must accept or reject')
    }
  }
}

export function cursorRequest(method: string, params: unknown): AcpRequestPresentation | undefined {
  if (method === 'cursor/ask_question') {
    return questionRequest(params)
  }
  if (method === 'cursor/create_plan') {
    return planRequest(params)
  }
  return undefined
}
