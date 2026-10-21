import { defineMethod } from '../core'
import { languageServerHost } from '../../../language-server/language-server-host'
import {
  LanguageServerAsk,
  LanguageServerStop,
  LanguageServerStopWorktree
} from '../../../../shared/rpc-contract/language-server-params'
import {
  remoteRpcContentBudget,
  remoteRpcResultExceedsContentBudget
} from '../../../../shared/remote-rpc-content-budget'
import type { LanguageServerReferencesResult } from '../../../../shared/language-server'

/** Drops the reference texts a remote reply cannot carry; Peek then shows the files already open. */
function referencesWithinBudget(
  result: LanguageServerReferencesResult,
  maxBytes: number | undefined
): LanguageServerReferencesResult {
  if (
    !result.ok ||
    maxBytes === undefined ||
    !remoteRpcResultExceedsContentBudget(result, maxBytes)
  ) {
    return result
  }
  return { ...result, files: {} }
}

// Fork: hover, Cmd+click and references for a paired client (the companion window, the web client
// and mobile's editor), answered by the same host service the desktop window asks over IPC.
export const LANGUAGE_SERVER_METHODS = [
  defineMethod({
    name: 'languageServer.definition',
    permission: 'workspace',
    params: LanguageServerAsk,
    handler: async (params) => languageServerHost().definition(params)
  }),
  defineMethod({
    name: 'languageServer.hover',
    permission: 'workspace',
    params: LanguageServerAsk,
    handler: async (params) => languageServerHost().hover(params)
  }),
  defineMethod({
    name: 'languageServer.references',
    permission: 'workspace',
    params: LanguageServerAsk,
    handler: async (params, { clientKind, requestId }) =>
      referencesWithinBudget(
        await languageServerHost().references(params),
        clientKind && requestId ? remoteRpcContentBudget(requestId) : undefined
      )
  }),
  defineMethod({
    name: 'languageServer.stop',
    permission: 'workspace',
    params: LanguageServerStop,
    handler: async (params) => {
      languageServerHost().stopLanguage(params.language)
      return {}
    }
  }),
  defineMethod({
    name: 'languageServer.stopWorktree',
    permission: 'workspace',
    params: LanguageServerStopWorktree,
    handler: async (params) => {
      languageServerHost().stopWorktree(params.worktreeRoot)
      return {}
    }
  })
]
