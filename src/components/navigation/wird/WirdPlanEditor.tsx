import { Button, Input, Select } from '../../ui'

export function WirdPlanEditor() {
  return (
    <section className="qar:grid qar:gap-3" aria-label="Daily Wird plan editor">
      <Select label="Unit" options={[{ label: 'Verse', value: 'verse' }, { label: 'Juz', value: 'juz' }, { label: 'Hizb', value: 'hizb' }]} defaultValue="verse" />
      <Input label="Target end date" type="date" />
      <Button>Create plan</Button>
    </section>
  )
}
