import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { translate } from '@/i18n/i18n'

export function DiscardProposalsConfirmDialog({
  open,
  count,
  onOpenChange,
  onConfirm
}: {
  open: boolean
  count: number
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {translate(
              'auto.components.sourceControl.pendingReview.discardProposalsTitle',
              'Drop all proposed comments?'
            )}
          </DialogTitle>
          <DialogDescription>
            {translate(
              'auto.components.sourceControl.pendingReview.discardProposalsDescription',
              '{{count}} proposed comments will be removed. Comments you already accepted stay. This cannot be undone.',
              { count }
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {translate(
              'auto.components.sourceControl.pendingReview.discardProposalsCancel',
              'Cancel'
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {translate(
              'auto.components.sourceControl.pendingReview.discardProposalsAction',
              'Drop all'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
