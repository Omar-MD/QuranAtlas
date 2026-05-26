import { Button, Switch } from '../../ui'

export function WirdReminderControl({ denied = false }: { denied?: boolean }) {
  return (
    <section className="qar:grid qar:gap-2" aria-label="Daily Wird reminders">
      <Switch label="Reminder" />
      <Button size="sm" variant={denied ? 'danger' : 'secondary'}>{denied ? 'Notifications denied' : 'Request notification access'}</Button>
    </section>
  )
}
