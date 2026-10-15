import { Extension, type Editor } from '@tiptap/react'
import { Plugin } from '@tiptap/pm/state'

export type MentionQueryState = {
  query: string
  from: number
  to: number
  left: number
  top: number
  bottom: number
}

export type MentionMode = 'user' | 'file'

export type ReviewMentionOptions = {
  onQueryChange: (state: MentionQueryState | null) => void
  onKeyDown: (event: KeyboardEvent) => boolean
  onEditor: (editor: Editor | null) => void
  mode: () => MentionMode
}

const MENTION_BEFORE_CURSOR: Record<MentionMode, RegExp> = {
  user: /(^|[\s([{,])@([A-Za-z0-9-]*)$/,
  file: /(^|[\s([{,])@([^\s@]*)$/
}

export function readMentionQuery(before: string, mode: MentionMode): string | null {
  const match = MENTION_BEFORE_CURSOR[mode].exec(before)
  return match ? (match[2] ?? '') : null
}

export const ReviewMention = Extension.create<ReviewMentionOptions>({
  name: 'reviewMention',
  priority: 1000,

  addOptions() {
    return {
      onQueryChange: () => undefined,
      onKeyDown: () => false,
      onEditor: () => undefined,
      mode: () => 'user'
    }
  },

  onCreate() {
    this.options.onEditor(this.editor)
  },

  onDestroy() {
    this.options.onEditor(null)
  },

  addProseMirrorPlugins() {
    const options = this.options
    return [
      new Plugin({
        view: () => ({
          update: (view) => {
            const { selection } = view.state
            if (!selection.empty || !view.hasFocus()) {
              options.onQueryChange(null)
              return
            }
            const $from = selection.$from
            const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼')
            const query = readMentionQuery(before, options.mode())
            if (query === null) {
              options.onQueryChange(null)
              return
            }
            const from = selection.from - query.length - 1
            const coords = view.coordsAtPos(selection.from)
            options.onQueryChange({
              query,
              from,
              to: selection.from,
              left: coords.left,
              top: coords.top,
              bottom: coords.bottom
            })
          },
          destroy: () => options.onQueryChange(null)
        }),
        props: {
          handleKeyDown: (_view, event) => options.onKeyDown(event),
          handleDOMEvents: {
            blur: () => {
              options.onQueryChange(null)
              return false
            }
          }
        }
      })
    ]
  }
})
