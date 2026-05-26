import { Dialog, Button } from '../../ui'

export function WirdResetConfirm() {
  return (
    <Dialog title="Reset Daily Wird" trigger={<Button size="sm" variant="danger">Reset plan</Button>}>
      <p className="qar:m-0 qar:text-sm qar:text-muted">Resetting removes the active local plan from settings.wirdPlan.</p>
      <Button size="sm" variant="danger">Confirm reset</Button>
    </Dialog>
  )
}
