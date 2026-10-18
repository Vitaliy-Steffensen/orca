import { z } from 'zod'

const OptionalStatus = z.string().optional()

const StatusByCondition = z.object({
  merged: OptionalStatus,
  closed: OptionalStatus,
  reviewing: OptionalStatus,
  conflicts: OptionalStatus,
  draft: OptionalStatus,
  'changes-requested': OptionalStatus,
  merging: OptionalStatus,
  'pm-approval': OptionalStatus,
  review: OptionalStatus
})

const ActionPrompts = z.record(z.string(), z.string()).optional()

export const WorkspaceStatusRules = z.object({
  repoIds: z.array(z.string()),
  statusByCondition: StatusByCondition,
  mergingCheckName: z.string(),
  newWorkspaceStatus: z.string().nullable().optional(),
  newWorkspaceStatusSince: z.number().nullable().optional(),
  pmApprovalTeam: z.string().nullable(),
  onResolved: z.enum(['delete', 'archive', 'none']),
  onReviewed: z.enum(['delete', 'archive', 'none']).optional(),
  resolveConflictsWithAgent: z.boolean().optional(),
  conflictPromptTemplate: z.string().optional(),
  reviewEnteredCommand: z.string().optional(),
  actionPrompts: ActionPrompts,
  reviewInbox: z.object({
    enabled: z.boolean(),
    agent: z.string(),
    view: z.enum(['chat', 'terminal', 'claude-web', 'default']).optional(),
    promptTemplate: z.string(),
    rereviewPromptTemplate: z.string().optional()
  }),
  handledPullRequests: z.array(z.string()),
  ledgerVersion: z.number().optional()
})
