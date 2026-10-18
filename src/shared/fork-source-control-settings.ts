import type { NativeChatGlobalSettings } from './native-chat-appearance-settings'

// Fork: kept out of global-settings-types.ts, which sits at the max-lines ceiling.
export type SectionLayout = { order?: string[]; hidden?: string[] }

export type ForkSourceControlSettings = {
  /** Dragged order and hidden sections of the source-control panel, and of the PR panel under `pr` (`shared/source-control-sections.ts`). */
  sourceControlSectionLayout?: SectionLayout & { pr?: SectionLayout }
}

/** What GlobalSettings extends: upstream's native-chat settings plus the fork's. */
export type ForkBaseSettings = NativeChatGlobalSettings & ForkSourceControlSettings
