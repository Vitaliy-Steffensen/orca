import { Copy, MessageCircleQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'

export type MonacoSelectionToolbarProps = {
  /** Null on the surfaces and selections where the action is unavailable. */
  onAsk: (() => void) | null
  onCopy: (() => void) | null
  copyShortcutLabel: string
  copied: boolean
}

export function MonacoSelectionToolbar({
  onAsk,
  onCopy,
  copyShortcutLabel,
  copied
}: MonacoSelectionToolbarProps): React.JSX.Element {
  return (
    <div
      className="flex items-center gap-0.5"
      // Why: Monaco collapses the selection on any mousedown it sees inside the editor.
      onMouseDown={(event) => event.preventDefault()}
    >
      {onAsk ? (
        <Button type="button" variant="ghost" size="xs" onClick={onAsk}>
          <MessageCircleQuestion />
          {translate('components.editor.selectionToolbar.ask', 'Ask')}
        </Button>
      ) : null}
      {onCopy ? (
        <Button type="button" variant="ghost" size="xs" disabled={copied} onClick={onCopy}>
          <Copy />
          {copied
            ? translate('components.editor.selectionToolbar.copied', 'Copied')
            : `${translate('components.editor.selectionToolbar.copyContext', 'Copy context')} ${copyShortcutLabel}`}
        </Button>
      ) : null}
    </div>
  )
}
