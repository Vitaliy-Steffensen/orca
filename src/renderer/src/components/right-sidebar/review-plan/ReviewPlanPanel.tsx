import React, { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, ScanSearch, ScanEye } from 'lucide-react'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { FileCommentBadges } from '@/components/diff-comments/FileCommentBadges'
import { useWorkspaceFileCommentCounts } from '@/components/diff-comments/file-comment-counts'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import { basename, joinPath } from '@/lib/path'
import { detectLanguage } from '@/lib/language-detect'
import {
  clearSourceControlReviewOrder,
  setSourceControlReviewOrder
} from '@/lib/source-control-review-order'
import {
  buildReviewPlanView,
  isReviewPlanStale,
  type ReviewPlan
} from '../../../../../shared/review-plan'
import {
  buildSourceControlTree,
  compactSourceControlTree,
  flattenSourceControlTree,
  type SourceControlTreeNode
} from '../source-control-tree'
import {
  SOURCE_CONTROL_TREE_DIRECTORY_PADDING_PX,
  SOURCE_CONTROL_TREE_FILE_PADDING_PX,
  SOURCE_CONTROL_TREE_INDENT_PX
} from '../source-control/listing/row-layout'
import { launchWorkspaceAction } from '../workspace-actions/launch-workspace-action'
import { useReviewPlan } from './use-review-plan'

type PlanEntry = { path: string }
type PlanNode = SourceControlTreeNode<PlanEntry, string>

const THRESHOLDS = ['0', '0.4', '0.6', '0.8'] as const

function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

function groupRows(n: number, files: string[], collapsed: ReadonlySet<string>): PlanNode[] {
  const tree = compactSourceControlTree(
    buildSourceControlTree<PlanEntry, string>(
      `plan-${n}`,
      files.map((path) => ({ path }))
    )
  )
  return flattenSourceControlTree(tree, collapsed)
}

function scoreLabel(plan: ReviewPlan, path: string): string | null {
  const score = plan.ratings[path]?.score
  return score === undefined ? null : score.toFixed(1)
}

function PlanFileRow({
  node,
  plan,
  worktreeId,
  worktreePath,
  counts,
  onOpen
}: {
  node: Extract<PlanNode, { type: 'file' }>
  plan: ReviewPlan
  worktreeId: string
  worktreePath: string
  counts: ReturnType<typeof useWorkspaceFileCommentCounts>
  onOpen: (path: string) => void
}): React.JSX.Element {
  const score = scoreLabel(plan, node.path)
  return (
    <button
      type="button"
      data-source-control-path={node.path}
      data-review-plan-worktree={worktreeId}
      title={plan.ratings[node.path]?.reason ?? joinPath(worktreePath, node.path)}
      className="group flex w-full cursor-pointer items-center gap-1 py-1 pr-3 text-left transition-colors hover:bg-accent/40"
      style={{
        paddingLeft: `${node.depth * SOURCE_CONTROL_TREE_INDENT_PX + SOURCE_CONTROL_TREE_FILE_PADDING_PX}px`
      }}
      onClick={() => onOpen(node.path)}
    >
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-xs">{basename(node.path)}</span>
      <FileCommentBadges counts={counts.get(node.path)} />
      {score ? (
        <span className="shrink-0 text-3xs tabular-nums text-muted-foreground">{score}</span>
      ) : null}
    </button>
  )
}

export default function ReviewPlanPanel(): React.JSX.Element {
  const worktreeId = useAppStore((s) => s.activeWorktreeId)
  const worktreePath = useAppStore((s) =>
    s.activeWorktreeId ? (s.getKnownWorktreeById(s.activeWorktreeId)?.path ?? '') : ''
  )
  const head = useAppStore((s) =>
    s.activeWorktreeId ? (s.gitStatusHeadByWorktree?.[s.activeWorktreeId] ?? null) : null
  )
  const branchEntries = useAppStore((s) =>
    s.activeWorktreeId ? s.gitBranchChangesByWorktree[s.activeWorktreeId] : undefined
  )
  const statusEntries = useAppStore((s) =>
    s.activeWorktreeId ? s.gitStatusByWorktree[s.activeWorktreeId] : undefined
  )
  const openFile = useAppStore((s) => s.openFile)
  const setEditorViewMode = useAppStore((s) => s.setEditorViewMode)
  const counts = useWorkspaceFileCommentCounts(worktreeId)
  const planState = useReviewPlan(worktreeId)
  const [threshold, setThreshold] = useState<(typeof THRESHOLDS)[number]>('0')
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [launching, setLaunching] = useState(false)

  const changedPaths = useMemo(() => {
    const paths = new Set<string>()
    for (const entry of branchEntries ?? []) {
      paths.add(entry.path)
    }
    for (const entry of statusEntries ?? []) {
      paths.add(entry.path)
    }
    return [...paths]
  }, [branchEntries, statusEntries])

  const plan = planState.status === 'ready' ? planState.plan : null
  const view = useMemo(
    () => (plan ? buildReviewPlanView(plan, changedPaths, Number(threshold)) : null),
    [plan, changedPaths, threshold]
  )
  const sections = useMemo(() => {
    if (!view) {
      return []
    }
    const built = view.groups.map((group) => ({
      key: `group-${group.n}`,
      title: `${group.n}. ${group.title}`,
      count: group.files.length,
      total: group.totalFiles,
      rows: groupRows(group.n, group.files, collapsed)
    }))
    if (view.notCovered.length > 0) {
      built.push({
        key: 'not-covered',
        title: translate(
          'auto.components.reviewPlan.notCovered',
          'Not in the review plan ({{count}})',
          { count: view.notCovered.length }
        ),
        count: view.notCovered.length,
        total: view.notCovered.length,
        rows: groupRows(0, view.notCovered, collapsed)
      })
    }
    return built
  }, [view, collapsed])

  useEffect(() => {
    if (!worktreeId) {
      return
    }
    const order = sections.flatMap((section) =>
      section.rows.flatMap((row) => (row.type === 'file' ? [row.path] : []))
    )
    setSourceControlReviewOrder(worktreeId, order)
    return () => clearSourceControlReviewOrder(worktreeId)
  }, [sections, worktreeId])

  const run = (kind: 'review' | 'regroup'): void => {
    setLaunching(true)
    void launchWorkspaceAction(kind).finally(() => setLaunching(false))
  }
  const toggleDirectory = (key: string): void =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (!next.delete(key)) {
        next.add(key)
      }
      return next
    })
  const openPlanFile = (path: string): void => {
    if (!worktreeId || !worktreePath) {
      return
    }
    const absPath = joinPath(worktreePath, path)
    openFile({
      filePath: absPath,
      relativePath: path,
      worktreeId,
      language: detectLanguage(path),
      mode: 'edit'
    })
    setEditorViewMode(absPath, 'changes')
  }

  if (!plan || !view) {
    return (
      <div className="flex flex-1 flex-col items-start gap-3 p-4">
        <p className="text-xs text-muted-foreground">
          {planState.status === 'loading'
            ? translate('auto.components.reviewPlan.loading', 'Looking for a review plan…')
            : planState.status === 'invalid'
              ? translate(
                  'auto.components.reviewPlan.invalid',
                  'The review plan file could not be read. Run the review again to rewrite it.'
                )
              : translate(
                  'auto.components.reviewPlan.empty',
                  'No review plan yet. Run a review to group and rate the changed files.'
                )}
        </p>
        {planState.status !== 'loading' ? (
          <Button size="sm" disabled={launching} onClick={() => run('review')}>
            <ScanEye className="size-3.5" />
            {translate('auto.components.reviewPlan.runReview', 'Run review')}
          </Button>
        ) : null}
      </div>
    )
  }

  const stale = isReviewPlanStale(plan, head)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-xs text-muted-foreground">
          {translate('auto.components.reviewPlan.threshold', 'Files needing review ≥')}
        </span>
        <Select
          value={threshold}
          onValueChange={(value) => {
            const next = THRESHOLDS.find((entry) => entry === value)
            if (next) {
              setThreshold(next)
            }
          }}
        >
          <SelectTrigger size="sm" className="w-[84px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THRESHOLDS.map((entry) => (
              <SelectItem key={entry} value={entry}>
                {entry === '0' ? translate('auto.components.reviewPlan.all', 'All') : entry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {stale ? (
        <div className="flex items-center gap-2 border-b border-status-warning-border bg-status-warning-background px-3 py-2 text-xs text-status-warning">
          <span className="min-w-0 flex-1">
            {translate(
              'auto.components.reviewPlan.stale',
              'Grouped for {{commit}}, not the current head.',
              { commit: shortSha(plan.commit) }
            )}
          </span>
          <Button size="xs" variant="ghost" disabled={launching} onClick={() => run('regroup')}>
            <ScanSearch className="size-3" />
            {translate('auto.components.reviewPlan.regroup', 'Regroup')}
          </Button>
        </div>
      ) : null}
      <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto pb-2">
        {sections.map((section) => (
          <section key={section.key}>
            <h3 className="px-3 pt-3 pb-1 text-xs font-medium">
              {section.title}
              <span className="ml-1.5 text-muted-foreground tabular-nums">
                {section.count === section.total
                  ? section.count
                  : `${section.count}/${section.total}`}
              </span>
            </h3>
            {section.rows.map((row) =>
              row.type === 'directory' ? (
                <button
                  key={row.key}
                  type="button"
                  className="flex w-full items-center gap-1 py-1 pr-3 text-left text-xs text-muted-foreground hover:bg-accent/40"
                  style={{
                    paddingLeft: `${row.depth * SOURCE_CONTROL_TREE_INDENT_PX + SOURCE_CONTROL_TREE_DIRECTORY_PADDING_PX}px`
                  }}
                  onClick={() => toggleDirectory(row.key)}
                >
                  {collapsed.has(row.key) ? (
                    <ChevronRight className="size-3 shrink-0" />
                  ) : (
                    <ChevronDown className="size-3 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{row.name}</span>
                  <span className={cn('shrink-0 text-3xs tabular-nums')}>{row.fileCount}</span>
                </button>
              ) : (
                <PlanFileRow
                  key={row.key}
                  node={row}
                  plan={plan}
                  worktreeId={worktreeId ?? ''}
                  worktreePath={worktreePath}
                  counts={counts}
                  onOpen={openPlanFile}
                />
              )
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
