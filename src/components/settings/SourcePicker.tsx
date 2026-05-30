import { SourcePickerRow } from '../sources/SourcePickerRow'

export function SourcePicker() {
  return (
    <section className="qar:grid qar:gap-2 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4" aria-label="Reader assets">
      <h3 className="qar:m-0 qar:text-base">Reader assets</h3>
      <SourcePickerRow label="Qalun" status="Active" />
      <SourcePickerRow label="Hafs" status="Install available" />
      <SourcePickerRow label="Warsh" status="Install available" />
    </section>
  )
}
