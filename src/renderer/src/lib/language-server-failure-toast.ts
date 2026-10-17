import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { languageServerOptions, type LanguageServerLanguage } from '../../../shared/language-server'

export const FAILURE_TOAST_COOLDOWN_MS = 60_000

const reportedAtByKey = new Map<string, number>()

// Why a cooldown and not once ever: Cmd+hover asks for a definition on every mouse move, so one
// toast per failure would flood, but a server that stays down has to say so again when the user
// comes back — otherwise Monaco's "No definition found" is the only thing they ever see.
export function reportLanguageServerFailure(
  { language, server }: { language: LanguageServerLanguage; server: string },
  error: string,
  now: number = Date.now()
): void {
  const key = `${language}\0${server}\0${error}`
  const reportedAt = reportedAtByKey.get(key)
  if (reportedAt !== undefined && now - reportedAt < FAILURE_TOAST_COOLDOWN_MS) {
    return
  }
  reportedAtByKey.set(key, now)
  const name = languageServerOptions(language)[server]?.name ?? server
  toast.error(
    translate(
      'languageServers.unavailable',
      '{{server}} is unavailable ({{error}}). Install it in the project, or choose another server or its path in Settings → Language Servers.',
      { server: name, error }
    )
  )
}

/** Why: after a restart or a settings change the next failure is news again, cooldown or not. */
export function forgetLanguageServerFailures(
  languages: readonly LanguageServerLanguage[] = []
): void {
  if (languages.length === 0) {
    reportedAtByKey.clear()
    return
  }
  for (const key of reportedAtByKey.keys()) {
    if (languages.some((language) => key.startsWith(`${language}\0`))) {
      reportedAtByKey.delete(key)
    }
  }
}
