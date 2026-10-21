import { z } from 'zod'
import { LANGUAGE_SERVER_LANGUAGES } from '../language-server'
import {
  OptionalPlainString,
  requiredNumber,
  requiredString,
  requiredStringAllowingEmpty
} from './rpc-param-primitives'

const LanguageServerLanguageParam = z.enum(LANGUAGE_SERVER_LANGUAGES)

/** One hover, definition or references ask, carrying the editor's text so an unsaved buffer answers. */
export const LanguageServerAsk = z
  .object({
    language: LanguageServerLanguageParam,
    server: OptionalPlainString,
    command: OptionalPlainString,
    filePath: requiredString('Missing file path'),
    worktreeRoot: requiredString('Missing worktree root'),
    repoRoot: OptionalPlainString,
    venvSetting: OptionalPlainString,
    text: requiredStringAllowingEmpty('Missing file text'),
    line: requiredNumber('Missing line'),
    character: requiredNumber('Missing character')
  })
  .transform((value) => ({
    ...value,
    server: value.server ?? '',
    command: value.command?.trim() ? value.command.trim() : null,
    repoRoot: value.repoRoot || null,
    venvSetting: value.venvSetting ?? null
  }))

export const LanguageServerStop = z.object({ language: LanguageServerLanguageParam })

export const LanguageServerStopWorktree = z.object({
  worktreeRoot: requiredString('Missing worktree root')
})
