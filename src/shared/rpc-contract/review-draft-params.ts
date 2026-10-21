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

export const ReviewSummaryGet = WorktreeSelector

const MAX_ASSET_NAME_LENGTH = 255
// Base64 of the largest attachment GitHub takes, plus padding.
const MAX_ASSET_BASE64_LENGTH = Math.ceil((100 * 1024 * 1024) / 3) * 4

/** Why the bytes travel with the request: the CLI may run on a host the main process cannot read. */
export const ReviewAssetUpload = WorktreeSelector.extend({
  name: z.string().trim().min(1).max(MAX_ASSET_NAME_LENGTH),
  contentType: z.string().trim().min(1).max(MAX_AGENT_NAME_LENGTH),
  base64: z.string().min(1).max(MAX_ASSET_BASE64_LENGTH)
})
