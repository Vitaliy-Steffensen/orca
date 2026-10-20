import { z } from 'zod'

export const REVIEW_PLAN_RELATIVE_PATH = '.orca/review-plan.json'

const ReviewPlanSchema = z.object({
  schema: z.literal(1),
  commit: z.string(),
  base: z.string().optional(),
  generatedAt: z.number().optional(),
  groups: z.array(z.object({ n: z.number(), title: z.string(), files: z.array(z.string()) })),
  ratings: z.record(z.string(), z.object({ score: z.number(), reason: z.string().optional() }))
})

export type ReviewPlan = z.infer<typeof ReviewPlanSchema>

export type ReviewPlanGroupView = {
  n: number
  title: string
  files: string[]
  /** Files in the group before the rating filter, for the "3 of 7" count. */
  totalFiles: number
}

export type ReviewPlanView = {
  groups: ReviewPlanGroupView[]
  notCovered: string[]
}

export function parseReviewPlan(raw: string): ReviewPlan | null {
  try {
    const parsed = ReviewPlanSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function isReviewPlanStale(plan: ReviewPlan, head: string | null): boolean {
  return head !== null && head !== '' && plan.commit !== head
}

export function buildReviewPlanView(
  plan: ReviewPlan,
  changedPaths: readonly string[] | null,
  minScore: number
): ReviewPlanView {
  // Why an unrated file stays visible: hiding a file the plan never scored would hide it from review.
  const passes = (path: string): boolean => (plan.ratings[path]?.score ?? 1) >= minScore
  const covered = new Set(plan.groups.flatMap((group) => group.files))
  const groups = [...plan.groups]
    .sort((a, b) => a.n - b.n)
    .map((group) => ({
      n: group.n,
      title: group.title,
      files: group.files.filter(passes),
      totalFiles: group.files.length
    }))
    .filter((group) => group.files.length > 0)
  const notCovered = (changedPaths ?? []).filter((path) => !covered.has(path) && passes(path))
  return { groups, notCovered }
}
