import { callRuntimeRpc } from '@/runtime/runtime-rpc-client'
import type {
  LanguageServerDefinitionResult,
  LanguageServerHoverResult,
  LanguageServerLanguage,
  LanguageServerReferencesResult,
  LanguageServerRequest
} from '../../../shared/language-server'
import type { RuntimeClientTarget } from '../../../shared/runtime-client-target'

type AskResult = {
  definition: LanguageServerDefinitionResult
  hover: LanguageServerHoverResult
  references: LanguageServerReferencesResult
}

/** What a host with nothing to say answers; there is no server for the user to go fix. */
const SILENT: AskResult = {
  definition: { ok: true, locations: [] },
  hover: { ok: true, markdown: null },
  references: { ok: true, locations: [], files: {} }
}

const askedTargets = new Map<string, RuntimeClientTarget>()

function targetKey(target: RuntimeClientTarget): string {
  return target.kind === 'environment' ? `runtime:${target.environmentId}` : 'local'
}

// Why silent: a host that predates `languageServer.*` has no server to offer, and saying so on
// every hover would be noise.
function isUnknownMethod(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false
  }
  const { code } = error
  return code === 'method_not_found' || code === -32601
}

/**
 * Fork: one ask routed to the Orca that holds the file — this app over IPC, or a paired runtime
 * (what a companion window and the web client see) over its own transport.
 */
export async function askLanguageServer<TAsk extends keyof AskResult>(
  target: RuntimeClientTarget,
  ask: TAsk,
  request: LanguageServerRequest
): Promise<AskResult[TAsk]> {
  askedTargets.set(targetKey(target), target)
  try {
    const result =
      target.kind === 'environment'
        ? await callRuntimeRpc<AskResult[TAsk]>(target, `languageServer.${ask}`, request)
        : // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the bridge is keyed by the same `ask`, so its result is this ask's result; TypeScript cannot narrow an indexed call through the generic.
          ((await window.api.languageServer[ask](request)) as AskResult[TAsk])
    // Why the fallback: a client whose api has no language-server bridge answers nothing at all.
    return result ?? SILENT[ask]
  } catch (error) {
    if (isUnknownMethod(error)) {
      return SILENT[ask]
    }
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: every result here is a discriminated union whose failure arm is exactly this shape.
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    } as AskResult[TAsk]
  }
}

/** Stops the language's servers on every host asked so far; each restarts on the next ask. */
export async function stopLanguageServers(language: LanguageServerLanguage): Promise<void> {
  const targets: RuntimeClientTarget[] =
    askedTargets.size > 0 ? [...askedTargets.values()] : [{ kind: 'local' }]
  await Promise.all(
    targets.map((target) =>
      target.kind === 'environment'
        ? callRuntimeRpc(target, 'languageServer.stop', { language })
        : window.api.languageServer.stop({ language })
    )
  )
}

export async function stopWorktreeLanguageServers(
  target: RuntimeClientTarget,
  worktreeRoot: string
): Promise<void> {
  if (target.kind === 'environment') {
    await callRuntimeRpc(target, 'languageServer.stopWorktree', { worktreeRoot })
    return
  }
  await window.api.languageServer.stopWorktree({ worktreeRoot })
}
