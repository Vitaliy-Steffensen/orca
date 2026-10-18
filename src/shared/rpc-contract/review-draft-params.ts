import { z } from 'zod'
import { WorktreeSelector } from './worktree-params'

const MAX_REVIEW_BODY_LENGTH = 65_536
const MAX_AGENT_NAME_LENGTH = 80
const MAX_FILE_PATH_LENGTH = 4_096

export const ReviewCommentAdd = WorktreeSelector.extend({
  path: z.string().trim().min(1).max(MAX_FILE_PATH_LENGTH),
  line: z.number().int().positive(),
  startLine: z.number().int().positive().optional(),
  body: z.string().trim().min(1).max(MAX_REVIEW_BODY_LENGTH),
  agent: z.string().trim().min(1).max(MAX_AGENT_NAME_LENGTH)
}).refine((params) => params.startLine === undefined || params.startLine <= params.line, {
  message: 'startLine must not be after line'
})

export const ReviewCommentList = WorktreeSelector

export const ReviewCommentRemove = WorktreeSelector.extend({
  id: z.string().min(1).max(200)
})

/** An empty body clears the summary, the way the composer does. */
export const ReviewSummarySet = WorktreeSelector.extend({
  body: z.string().max(MAX_REVIEW_BODY_LENGTH)
})
