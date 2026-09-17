import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as SliderPrimitive from '@radix-ui/react-slider'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { Check, ChevronDown } from 'lucide-react'
import { forwardRef, useId, useState } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

import { cn } from '../../design-system/utils/cn'

const fieldClass =
  'qar:min-h-11 qar:w-full qar:rounded-control qar:border qar:border-border qar:bg-surface qar:px-3 qar:py-2 qar:font-ui qar:text-sm qar:text-text qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus qar:disabled:opacity-40'
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
        <SelectPrimitive.Content className="qar-react-select-content qar:z-50 qar:overflow-hidden qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-1 qar:text-text qar-react-overlay-shadow">
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                className="qar:flex qar:min-h-11 qar:cursor-default qar:items-center qar:gap-2 qar:rounded-control qar:px-2 qar:text-sm qar:outline-none qar:focus:bg-accent-tint qar:data-[disabled]:opacity-40"
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
  /** Suppress the selected-checkmark (compact chrome placements). */
  compact?: boolean
}

// Universal selected treatment: one solid ink pill (shape + contrast carry
// the state — never colour alone, no checkmarks).
export function SegmentedControl({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  compact: _compact = false,
}: SegmentedControlProps) {
  const groupName = useId()
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
      className="qar:inline-flex qar:min-w-0 qar:max-w-full qar:rounded-full qar:border qar:border-border qar:p-1"
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
              'qar-react-segmented-option qar:relative qar:flex qar:min-h-11 qar:min-w-0 qar:items-center qar:justify-center qar:rounded-full qar:px-3 qar:text-sm',
              selected ? 'qar-react-segmented-option--selected' : 'qar:text-muted qar:hover:text-text',
            )}
            key={option.value}
          >
            <input
              aria-label={accname}
              checked={selected}
              className="qar:absolute qar:inset-0 qar:m-0 qar:h-full qar:w-full qar:cursor-pointer qar:opacity-0"
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

export type StepperProps = {
  label: string
  options: Array<{ label: string; value: string }>
  value: string
  onValueChange: (value: string) => void
}

export function Stepper({ label, options, value, onValueChange }: StepperProps) {
  const index = options.findIndex((option) => option.value === value)
  return (
    <fieldset aria-label={label} className="qar-react-stepper">
      <button
        aria-label={`Decrease ${label}`}
        className="qar-react-stepper-button"
        disabled={index <= 0}
        onClick={() => {
          const previous = options[index - 1]
          if (previous) onValueChange(previous.value)
        }}
        type="button"
      >
        A−
      </button>
      <output aria-live="polite" className="qar-react-stepper-value">
        {options[index]?.label ?? value}
      </output>
      <button
        aria-label={`Increase ${label}`}
        className="qar-react-stepper-button"
        disabled={index < 0 || index >= options.length - 1}
        onClick={() => {
          const next = options[index + 1]
          if (next) onValueChange(next.value)
        }}
        type="button"
      >
        A+
      </button>
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
          'qar:flex qar:size-5 qar:items-center qar:justify-center qar:rounded-control qar:border qar:border-border qar:bg-surface qar:text-on-accent qar:data-[state=checked]:border-accent qar:data-[state=checked]:bg-accent qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus qar:disabled:pointer-events-none qar:disabled:opacity-40',
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

export type SwitchProps = SwitchPrimitive.SwitchProps & { hideLabel?: boolean; label: string }
export function Switch({
  hideLabel = false,
  label,
  className,
  checked,
  defaultChecked,
  id,
  onCheckedChange,
  ...props
}: SwitchProps) {
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
          'qar:relative qar:inline-flex qar:min-h-11 qar:min-w-11 qar:items-center qar:justify-center qar:rounded-control qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus qar:disabled:pointer-events-none qar:disabled:opacity-40',
          className,
        )}
        id={switchId}
        onCheckedChange={handleCheckedChange}
        {...rootStateProps}
        {...props}
      >
        <span
          aria-hidden="true"
          className="qar:pointer-events-none qar:absolute qar:h-6 qar:w-11 qar:rounded-full qar:border qar:border-border qar:bg-border qar:transition-colors qar:data-[state=checked]:border-text qar:data-[state=checked]:bg-text"
          data-state={visualState ? 'checked' : 'unchecked'}
        />
        <SwitchPrimitive.Thumb className="qar:pointer-events-none qar:absolute qar:left-0 qar:top-1/2 qar:block qar:size-5 qar:-translate-y-1/2 qar:translate-x-0.5 qar:rounded-full qar:border qar:border-border qar:bg-surface qar:transition-transform qar:data-[state=checked]:translate-x-5" />
      </SwitchPrimitive.Root>
      <span className={hideLabel ? 'qar:sr-only' : undefined}>{label}</span>
    </label>
  )
}

const sliderThumbClass =
  'qar:block qar:size-5 qar:rounded-full qar:border qar:border-border qar:bg-surface qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus qar:disabled:pointer-events-none qar:disabled:opacity-40'

export type SliderProps = SliderPrimitive.SliderProps & { hideLabel?: boolean; label: string }
export function Slider({ hideLabel = false, label, className, ...props }: SliderProps) {
  return (
    <div className={cn(labelClass, className)}>
      <span className={hideLabel ? 'qar:sr-only' : undefined}>{label}</span>
      <SliderPrimitive.Root
        aria-label={label}
        className="qar:relative qar:flex qar:min-h-11 qar:w-full qar:touch-none qar:items-center"
        {...props}
      >
        <SliderPrimitive.Track className="qar:relative qar:h-1 qar:grow qar:rounded-full qar:bg-border">
          <SliderPrimitive.Range className="qar:absolute qar:h-full qar:rounded-full qar:bg-text" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb aria-label={label} className={sliderThumbClass} />
      </SliderPrimitive.Root>
    </div>
  )
}
