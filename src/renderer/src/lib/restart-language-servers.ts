import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import {
  LANGUAGE_SERVER_LANGUAGES,
  LANGUAGE_SERVERS,
  type LanguageServerLanguage
} from '../../../shared/language-server'
import { forgetLanguageServerFailures } from './language-server-failure-toast'
import { stopLanguageServers } from './language-server-client'

export type RestartLanguageServersDeps = {
  stop: (args: { language: LanguageServerLanguage }) => Promise<void>
  notify: { success: (message: string) => void; error: (message: string) => void }
}

const defaultDeps: RestartLanguageServersDeps = {
  stop: ({ language }) => stopLanguageServers(language),
  notify: { success: (message) => toast.success(message), error: (message) => toast.error(message) }
}

export function languageServerForMonacoLanguage(
  monacoLanguageId: string
): LanguageServerLanguage | null {
  return (
    LANGUAGE_SERVER_LANGUAGES.find((language) =>
      (LANGUAGE_SERVERS[language].monacoLanguageIds as readonly string[]).includes(monacoLanguageId)
    ) ?? null
  )
}

/** Fork: stops the servers; each starts fresh on the next definition, hover or references ask. */
export async function restartLanguageServers(
  languages: readonly LanguageServerLanguage[] = LANGUAGE_SERVER_LANGUAGES,
  deps: RestartLanguageServersDeps = defaultDeps
): Promise<void> {
  forgetLanguageServerFailures(languages)
  const results = await Promise.allSettled(languages.map((language) => deps.stop({ language })))
  if (results.some((result) => result.status === 'rejected')) {
    deps.notify.error(
      translate('languageServers.restartFailed', 'Could not restart the language server.')
    )
    return
  }
  deps.notify.success(
    translate('languageServers.restarted', 'Language server restarted. It starts again on use.')
  )
}
