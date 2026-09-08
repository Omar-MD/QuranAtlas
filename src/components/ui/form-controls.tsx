import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as SliderPrimitive from '@radix-ui/react-slider'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { Check, ChevronDown } from 'lucide-react'
import { forwardRef, useState } from 'react'
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

import { cn } from '../../design-system/utils/cn'

const fieldClass =
  'qar:min-h-11 qar:w-full qar:rounded-control qar:border qar:border-border qar:bg-surface qar:px-3 qar:py-2 qar:font-ui qar:text-sm qar:text-text qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus qar:disabled:opacity-55'
const labelClass = 'qar:grid qar:gap-1 qar:text-sm qar:text-muted'

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  hideLabel?: boolean
  label: string
  labelClassName?: string
  prefix?: ReactNode
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { hideLabel = false, label, labelClassName, className, id, prefix, ...props },
  ref,
) {
  const inputId = id ?? `qa-input-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <label className={cn(labelClass, labelClassName)} htmlFor={inputId}>
      <span className={hideLabel ? 'qar:sr-only' : undefined}>{label}</span>
      {prefix}
      <input className={cn(fieldClass, className)} id={inputId} ref={ref} {...props} />
    </label>
  )
})

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }
export function Textarea({ label, className, id, ...props }: TextareaProps) {
  const inputId = id ?? `qa-textarea-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <label className={labelClass} htmlFor={inputId}>
      <span>{label}</span>
      <textarea className={cn(fieldClass, 'qar:min-h-24', className)} id={inputId} {...props} />
    </label>
  )
}

export type SelectOption = { label: string; value: string; disabled?: boolean }
export type SelectProps = SelectPrimitive.SelectProps & {
  className?: string
  label: string
  options: SelectOption[]
  placeholder?: string
}

export function Select({ className, label, options, placeholder = 'Select', ...props }: SelectProps) {
  return (
    <SelectPrimitive.Root {...props}>
      <SelectPrimitive.Trigger
        aria-label={label}
        className={cn(fieldClass, 'qar:flex qar:items-center qar:justify-between qar:gap-2', className)}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon aria-hidden="true">
          <ChevronDown size={16} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="qar-react-select-content qar:z-50 qar:overflow-hidden qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-1 qar:text-text qar:shadow-lg">
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                className="qar:flex qar:min-h-11 qar:cursor-default qar:items-center qar:gap-2 qar:rounded-control qar:px-2 qar:text-sm qar:outline-none qar:focus:bg-canvas qar:data-[disabled]:opacity-50"
                disabled={option.disabled}
                key={option.value}
                value={option.value}
              >
                <SelectPrimitive.ItemIndicator>
                  <Check size={14} />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

export type SegmentedControlOption = { label: string; value: string; disabled?: boolean; shortLabel?: string }
export type SegmentedControlProps = {
  label: string
  options: SegmentedControlOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

export function SegmentedControl({ label, options, value, defaultValue, onValueChange }: SegmentedControlProps) {
  const groupName = `qa-segmented-${label.replace(/\W+/g, '-').toLowerCase()}`
  const firstEnabledValue = options.find((option) => !option.disabled)?.value
  const [internalValue, setInternalValue] = useState(defaultValue ?? value ?? firstEnabledValue ?? options[0]?.value)
  const rawSelectedValue = value ?? internalValue
  const selectedOption = options.find((option) => option.value === rawSelectedValue && !option.disabled)
  const selectedValue = selectedOption?.value ?? firstEnabledValue
  function selectOption(nextValue: string) {
    if (options.find((option) => option.value === nextValue)?.disabled) return
    if (value == null) setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }
  return (
    <fieldset
      aria-label={label}
      className="qar:inline-flex qar:min-w-0 qar:max-w-full qar:rounded-control qar:border qar:border-border qar:bg-surface qar:p-1"
      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the design brief requires an explicit radiogroup role even though the fieldset with radio inputs already implies it
      role="radiogroup"
    >
      {options.map((option) => {
        const selected = option.value === selectedValue
        const accname = option.shortLabel
          ? `${label}: ${option.shortLabel} — ${option.label}`
          : `${label}: ${option.label}`
        return (
          <label
            className={cn(
              'qar-react-segmented-option qar:flex qar:min-h-11 qar:min-w-0 qar:items-center qar:rounded-control qar:px-3 qar:text-sm',
              selected ? 'qar-react-segmented-option--selected' : 'qar:text-muted',
            )}
            key={option.value}
          >
            <input
              aria-label={accname}
              checked={selected}
              className="qar:sr-only"
              disabled={option.disabled}
              name={groupName}
              onChange={() => selectOption(option.value)}
              type="radio"
              value={option.value}
            />
            <span className="qar:truncate">{option.shortLabel ?? option.label}</span>
          </label>
        )
      })}
    </fieldset>
  )
}

export type CheckboxProps = CheckboxPrimitive.CheckboxProps & { label: string }
export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const checkboxId = id ?? `qa-checkbox-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <label className="qar:inline-flex qar:items-center qar:gap-2 qar:text-sm qar:text-text" htmlFor={checkboxId}>
      <CheckboxPrimitive.Root
        className={cn(
          'qar:flex qar:size-5 qar:items-center qar:justify-center qar:rounded-control qar:border qar:border-border qar:bg-surface qar:text-surface qar:data-[state=checked]:bg-accent qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus',
          className,
        )}
        id={checkboxId}
        {...props}
      >
        <CheckboxPrimitive.Indicator>
          <Check size={14} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <span>{label}</span>
    </label>
  )
}

export type SwitchProps = SwitchPrimitive.SwitchProps & { label: string }
export function Switch({ label, className, checked, defaultChecked, id, onCheckedChange, ...props }: SwitchProps) {
  const [visualChecked, setVisualChecked] = useState(Boolean(checked ?? defaultChecked))
  const switchId = id ?? `qa-switch-${label.replace(/\W+/g, '-').toLowerCase()}`

  function handleCheckedChange(nextChecked: boolean) {
    setVisualChecked(nextChecked)
    onCheckedChange?.(nextChecked)
  }
  const rootStateProps = checked === undefined ? { defaultChecked } : { checked }
  const visualState = checked ?? visualChecked

  return (
    <label className="qar:inline-flex qar:items-center qar:gap-2 qar:text-sm qar:text-text" htmlFor={switchId}>
      <SwitchPrimitive.Root
        className={cn(
          'qar:relative qar:inline-flex qar:min-h-11 qar:min-w-11 qar:items-center qar:justify-center qar:rounded-control qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus',
          className,
        )}
        id={switchId}
        onCheckedChange={handleCheckedChange}
        {...rootStateProps}
        {...props}
      >
        <span
          aria-hidden="true"
          className="qar:pointer-events-none qar:absolute qar:h-6 qar:w-11 qar:rounded-surface qar:border qar:border-border qar:bg-muted qar:data-[state=checked]:bg-accent"
          data-state={visualState ? 'checked' : 'unchecked'}
        />
        <SwitchPrimitive.Thumb className="qar:pointer-events-none qar:absolute qar:left-0 qar:top-1/2 qar:block qar:size-5 qar:-translate-y-1/2 qar:translate-x-0.5 qar:rounded-surface qar:bg-surface qar:transition-transform qar:data-[state=checked]:translate-x-5" />
      </SwitchPrimitive.Root>
      <span>{label}</span>
    </label>
  )
}

export type SliderProps = SliderPrimitive.SliderProps & { hideLabel?: boolean; label: string }
export function Slider({ hideLabel = false, label, className, ...props }: SliderProps) {
  return (
    <div className={cn(labelClass, className)}>
      <span className={hideLabel ? 'qar:sr-only' : undefined}>{label}</span>
      <SliderPrimitive.Root
        aria-label={label}
        className="qar:relative qar:flex qar:h-6 qar:w-full qar:touch-none qar:items-center"
        {...props}
      >
        <SliderPrimitive.Track className="qar:relative qar:h-2 qar:grow qar:rounded-surface qar:bg-border">
          <SliderPrimitive.Range className="qar:absolute qar:h-full qar:rounded-surface qar:bg-accent" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={label}
          className="qar:block qar:size-5 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:shadow-sm qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus"
        />
      </SliderPrimitive.Root>
    </div>
  )
}
