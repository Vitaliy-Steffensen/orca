export type AutoMergeCheckRepairPromptInput = {
  prNumber: number
  repo: string
  branch: string
  headOid: string
  failingChecks: readonly string[]
  worktreePath: string
}

export function buildAutoMergeCheckRepairPrompt(input: AutoMergeCheckRepairPromptInput): string {
  const checks = input.failingChecks.map((name) => `- ${name}`).join('\n')
  return [
    `CI is failing on pull request #${input.prNumber} (${input.repo}), branch ${input.branch}, commit ${input.headOid}. Orca will auto-merge it once CI is green, so get it there.`,
    '',
    'Failing checks:',
    checks,
    '',
    `You are in ${input.worktreePath}. Steps:`,
    `1. Read the failing logs: \`gh run list --branch ${input.branch} --limit 5\`, then \`gh run view <run-id> --log-failed\`.`,
    '2. Decide whether each failure is flaky or real. Flaky looks like: a test unrelated to this diff, a timeout, a network or registry error, a known-racy test, or the same job passing on an earlier run of this commit.',
    `3. If every failure is flaky, rerun only the failed jobs with \`gh run rerun <run-id> --failed\` and stop. Do not change any code.`,
    '4. If a failure is real, fix the cause in this checkout, run the relevant tests locally, commit, and push with a plain git push.',
    '',
    'Rules:',
    '- Never force-push; if the push is rejected, stop and report why.',
    '- Do not disable, skip, or weaken a test to make it pass.',
    '- Do not merge the pull request; Orca does that when CI is green.',
    '',
    'Reply with one line: flaky and rerun, fixed and pushed, or what blocked you.'
  ].join('\n')
}
