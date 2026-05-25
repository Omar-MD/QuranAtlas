# React Tech Stack Refactor 06 - Owned shadcn/Radix Component Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first owned React UI component layer so future React surfaces compose QuranAtlas primitives and Radix-backed behavior wrappers instead of raw HTML, raw Radix parts, or upstream shadcn defaults.

**Architecture:** Build local source under `src-react/components/ui/**` with QuranAtlas-owned APIs, semantic-token Tailwind classes, Storybook proof, React component tests, and static Radix-boundary enforcement. shadcn/ui is only a copy-in reference; delivered code is project-owned and must remain isolated from shipped Svelte behavior.

**Tech Stack:** React, TypeScript, Radix UI primitives, class-variance-authority, clsx, tailwind-merge, lucide-react, Storybook React/Vite, Vitest, React Testing Library, Tailwind v4 semantic tokens.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `DESIGN.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/context/style-map.md`
- `docs/tech-stack.md`
- `package.json`
- `vite.react.config.js`
- `tsconfig.react.json`
- `.storybook/main.ts`
- `.storybook/preview.tsx`
- `src-react/design-system/index.css`
- `src-react/design-system/docs/token-usage.md`
- `src-react/design-system/docs/story-requirements.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-03-tokens-tailwind-design-system-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-04-storybook-component-test-harness-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-selection-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-06-owned-shadcn-radix-component-layer-spec.md`
- Wave 1 plans `03`, `04`, and `05` under `docs/superpowers/plans/`

## Dependency Gates

This plan depends on Wave 1 plans `03`, `04`, and `05`.

- Plan `03` must have created the React semantic token and Tailwind v4 layer.
- Plan `04` must have created React Storybook and `test:react` / `test:storybook:react`.
- Plan `05` must have selected or explicitly deferred the visual-regression command for React component proof.
- React remains isolated in `src-react/**` and `dist-react/`; `pnpm run build` and shipped Svelte behavior stay unchanged.

## File Structure

Create:

- `components.json` - shadcn/ui-compatible ownership/config record for the React tree.
- `src-react/design-system/utils/cn.ts` - class composition helper.
- `src-react/components/ui/index.ts` - public UI barrel.
- `src-react/components/ui/button.tsx` - `Button` primitive.
- `src-react/components/ui/icon-button.tsx` - icon-only button primitive with required accessible name.
- `src-react/components/ui/form-controls.tsx` - `Input`, `Textarea`, `Select`, `SegmentedControl`, `Checkbox`, `Switch`, and `Slider`.
- `src-react/components/ui/feedback.tsx` - `Badge`, `Progress`, and `Spinner`.
- `src-react/components/ui/tooltip.tsx` - Radix-backed `Tooltip`.
- `src-react/components/ui/overlays.tsx` - Radix-backed `Dialog`, `Sheet`, `Popover`, and `Toast`.
- `src-react/components/ui/menus.tsx` - Radix-backed `DropdownMenu`, `Tabs`, `Accordion`, and `Command`.
- `src-react/components/ui/disclosure.tsx` - focus-sensitive disclosure helper.
- `src-react/components/ui/ui.stories.tsx` - stories for every delivered primitive/wrapper.
- `tests/unit/react-components/ui-components.test.tsx` - component API and accessibility-sensitive tests.
- `scripts/check-react-radix-boundaries.mjs` - static import-boundary check.
- `tests/unit/react-components/check-react-radix-boundaries.test.mjs` - scanner positive/negative tests.
- `src-react/design-system/docs/components.md` - ownership, copy-in, and extension rules.

Modify:

- `package.json` - add component dependencies and wire the Radix-boundary check into React checks.
- `docs/tech-stack.md` - document component dependencies, ownership model, and scripts.
- `docs/context/repo-structure.md` - document `src-react/components/ui/**` and design-system helpers.
- `eslint.config.js`, `tsconfig.react.json`, or `vite.react.config.js` only if aliases from `components.json` need config support.

Do not modify:

- `src/**`
- `src/styles/**`
- current Svelte build/deploy scripts
- `public/dataset/**`
- Wave 1 plan files
- generated context fences by hand

## Task 1: Preflight And Current Docs

**Files:**
- Read: files listed in Required Context

- [ ] **Step 1: Confirm dependency outputs exist**

Run:

```bash
test -f vite.react.config.js
test -f src-react/design-system/index.css
test -f .storybook/main.ts
rg -n "visual:react|Selected:" docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-decision.md package.json
```

Expected: commands exit `0` or print the selected/deferred visual strategy from plan `05`. If any file is missing, stop and complete the dependency plan first.

- [ ] **Step 2: Verify shadcn and Radix docs before API work**

Run outside Codex's default sandbox:

```bash
npx ctx7@latest library "Radix UI" "How should Radix UI React primitives such as Dialog, Popover, Dropdown Menu, Tabs, Tooltip, Switch, Slider, Checkbox, Select, Toast, and Accordion be wrapped while preserving accessibility behavior?"
npx ctx7@latest docs /websites/radix-ui_primitives "How should Radix UI React primitives such as Dialog, Popover, Dropdown Menu, Tabs, Tooltip, Switch, Slider, Checkbox, Select, Toast, and Accordion be wrapped while preserving accessibility behavior?"
npx ctx7@latest docs /websites/ui_shadcn "How should shadcn/ui copied-owned React components be configured with components.json, aliases, Tailwind CSS variables, a utility helper, and local ownership?"
```

Expected: current docs confirm package names, component parts, and copied-owned configuration. If Context7 quota-blocks, record the failure in the 06 spec and stop implementation-sensitive work.

- [ ] **Step 3: Confirm no forbidden files are dirty from this task**

Run:

```bash
git diff --name-only -- src src/styles public/dataset docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-0[0-5]-*.md
```

Expected: no output from this plan. Do not revert unrelated output created by another worker.

## Task 2: Dependencies, Scripts, And shadcn Config

**Files:**
- Create: `components.json`
- Modify: `package.json`
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Install runtime component dependencies**

Run:

```bash
pnpm add @radix-ui/react-accordion@latest @radix-ui/react-checkbox@latest @radix-ui/react-dialog@latest @radix-ui/react-dropdown-menu@latest @radix-ui/react-popover@latest @radix-ui/react-progress@latest @radix-ui/react-select@latest @radix-ui/react-slider@latest @radix-ui/react-switch@latest @radix-ui/react-tabs@latest @radix-ui/react-toast@latest @radix-ui/react-tooltip@latest class-variance-authority@latest clsx@latest tailwind-merge@latest lucide-react@latest
```

Expected: `package.json` and `pnpm-lock.yaml` update for the listed runtime dependencies only. If install fails from sandbox DNS/network errors, rerun with approval outside the sandbox.

- [ ] **Step 2: Add static-check script**

Patch `package.json`:

```json
{
  "scripts": {
    "check:react:radix": "node scripts/check-react-radix-boundaries.mjs",
    "check:react": "pnpm run typecheck:react && pnpm run lint:react && node scripts/check-react-boundaries.mjs && pnpm run check:react:design && pnpm run check:react:radix"
  }
}
```

Expected: existing Svelte `check` remains unchanged.

- [ ] **Step 3: Create shadcn ownership config**

Create `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src-react/design-system/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": "qar"
  },
  "aliases": {
    "components": "@/src-react/components",
    "ui": "@/src-react/components/ui",
    "lib": "@/src-react/design-system",
    "utils": "@/src-react/design-system/utils",
    "hooks": "@/src-react/app/hooks"
  },
  "iconLibrary": "lucide"
}
```

Expected: the config records React-only paths and does not point at Svelte `src/**`.

- [ ] **Step 4: Document new stack entries**

Update `docs/tech-stack.md` with rows for Radix UI, owned shadcn-style components, CVA, class composition helpers, lucide-react, and `check:react:radix`. Include that these are React-only during dual-build and that direct Radix imports are forbidden outside `src-react/components/ui/**`.

Expected: package/script changes and ownership model are documented in the same task as the dependency change.

## Task 3: Utility And Public Barrel

**Files:**
- Create: `src-react/design-system/utils/cn.ts`
- Create: `src-react/components/ui/index.ts`

- [ ] **Step 1: Add class composition helper**

Create `src-react/design-system/utils/cn.ts`:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

Expected: all UI components use this helper for conditional classes.

- [ ] **Step 2: Add UI barrel**

Create `src-react/components/ui/index.ts`:

```ts
export { Button, buttonVariants, type ButtonProps } from './button'
export { IconButton, type IconButtonProps } from './icon-button'
export {
  Checkbox,
  Input,
  SegmentedControl,
  Select,
  Slider,
  Switch,
  Textarea,
  type CheckboxProps,
  type InputProps,
  type SegmentedControlProps,
  type SelectProps,
  type SliderProps,
  type SwitchProps,
  type TextareaProps,
} from './form-controls'
export { Badge, Progress, Spinner, type BadgeProps, type ProgressProps, type SpinnerProps } from './feedback'
export { Tooltip, type TooltipProps } from './tooltip'
export { Dialog, Popover, Sheet, Toast, type DialogProps, type PopoverProps, type SheetProps, type ToastProps } from './overlays'
export { Accordion, Command, DropdownMenu, Tabs, type AccordionProps, type CommandProps, type DropdownMenuProps, type TabsProps } from './menus'
export { Disclosure, type DisclosureProps } from './disclosure'
```

Expected: feature code has one stable import surface.

## Task 4: Level 1 Primitive Components

**Files:**
- Create: `src-react/components/ui/button.tsx`
- Create: `src-react/components/ui/icon-button.tsx`
- Create: `src-react/components/ui/form-controls.tsx`
- Create: `src-react/components/ui/feedback.tsx`

- [ ] **Step 1: Implement `Button`**

Create `src-react/components/ui/button.tsx`:

```tsx
import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../design-system/utils/cn'

export const buttonVariants = cva(
  'qar:inline-flex qar:min-h-10 qar:items-center qar:justify-center qar:gap-2 qar:rounded-control qar:border qar:border-border qar:px-4 qar:py-2 qar:font-ui qar:text-sm qar:font-medium qar:transition qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus qar:disabled:pointer-events-none qar:disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'qar:bg-accent qar:text-canvas qar:hover:bg-accent-strong',
        secondary: 'qar:bg-surface qar:text-text qar:hover:border-accent',
        ghost: 'qar:border-transparent qar:bg-transparent qar:text-text qar:hover:bg-surface',
        danger: 'qar:bg-danger qar:text-canvas',
      },
      size: {
        sm: 'qar:min-h-9 qar:px-3 qar:text-xs',
        md: 'qar:min-h-10 qar:px-4 qar:text-sm',
        lg: 'qar:min-h-11 qar:px-5 qar:text-base',
      },
      busy: {
        true: 'qar:cursor-progress',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
      busy: false,
    },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    busy?: boolean
  }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, busy = false, disabled, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, busy }), className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {children}
    </button>
  ),
)

Button.displayName = 'Button'
```

Expected: `Button` exposes variants instead of raw class fragments for normal use.

- [ ] **Step 2: Implement `IconButton`**

Create `src-react/components/ui/icon-button.tsx`:

```tsx
import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Button, type ButtonProps } from './button'

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> &
  Pick<ButtonProps, 'variant' | 'size' | 'busy'> & {
    label: string
    icon: ReactNode
  }

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, variant = 'ghost', size = 'md', ...props }, ref) => (
    <Button ref={ref} variant={variant} size={size} aria-label={label} {...props}>
      {icon}
    </Button>
  ),
)

IconButton.displayName = 'IconButton'
```

Expected: icon-only buttons require a non-empty `label`.

- [ ] **Step 3: Implement form controls**

Create `src-react/components/ui/form-controls.tsx` with these exports and rules:

```tsx
import { forwardRef } from 'react'
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as SliderPrimitive from '@radix-ui/react-slider'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { Check } from 'lucide-react'
import { cn } from '../../design-system/utils/cn'

const fieldClassName =
  'qar:min-h-10 qar:w-full qar:rounded-control qar:border qar:border-border qar:bg-canvas qar:px-3 qar:py-2 qar:text-sm qar:text-text qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-focus qar:disabled:opacity-50'

export type InputProps = InputHTMLAttributes<HTMLInputElement>
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldClassName, className)} {...props} />
))
Input.displayName = 'Input'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldClassName, 'qar:min-h-24 qar:resize-y', className)} {...props} />
))
Textarea.displayName = 'Textarea'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(fieldClassName, className)} {...props}>
    {children}
  </select>
))
Select.displayName = 'Select'

export type SegmentedControlProps = {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}
export function SegmentedControl({ label, value, options, onChange }: SegmentedControlProps) {
  return (
    <div role="radiogroup" aria-label={label} className="qar:inline-flex qar:rounded-control qar:border qar:border-border qar:bg-surface qar:p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={cn(
            'qar:min-h-9 qar:rounded-control qar:px-3 qar:text-sm qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-focus',
            option.value === value ? 'qar:bg-canvas qar:text-text' : 'qar:text-muted',
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export type CheckboxProps = CheckboxPrimitive.CheckboxProps & { label: string }
export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      aria-label={label}
      className={cn('qar:flex qar:size-5 qar:items-center qar:justify-center qar:rounded-control qar:border qar:border-border qar:bg-canvas qar:text-accent qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-focus', className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check aria-hidden="true" size={14} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export type SwitchProps = SwitchPrimitive.SwitchProps & { label: string }
export function Switch({ label, className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root aria-label={label} className={cn('qar:h-6 qar:w-11 qar:rounded-full qar:bg-border qar:data-[state=checked]:bg-accent qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-focus', className)} {...props}>
      <SwitchPrimitive.Thumb className="qar:block qar:size-5 qar:translate-x-0.5 qar:rounded-full qar:bg-canvas qar:transition qar:data-[state=checked]:translate-x-5" />
    </SwitchPrimitive.Root>
  )
}

export type SliderProps = SliderPrimitive.SliderProps & { label: string }
export function Slider({ label, className, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root aria-label={label} className={cn('qar:relative qar:flex qar:h-6 qar:w-full qar:touch-none qar:items-center', className)} {...props}>
      <SliderPrimitive.Track className="qar:relative qar:h-1 qar:flex-1 qar:rounded-full qar:bg-border">
        <SliderPrimitive.Range className="qar:absolute qar:h-full qar:rounded-full qar:bg-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="qar:block qar:size-5 qar:rounded-full qar:border qar:border-border qar:bg-canvas qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-focus" />
    </SliderPrimitive.Root>
  )
}
```

Expected: Radix form behavior imports stay inside `src-react/components/ui/**`.

- [ ] **Step 4: Implement feedback components**

Create `src-react/components/ui/feedback.tsx`:

```tsx
import * as ProgressPrimitive from '@radix-ui/react-progress'
import type { HTMLAttributes } from 'react'
import { cn } from '../../design-system/utils/cn'

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'accent' | 'danger'
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  const toneClass = {
    neutral: 'qar:bg-surface qar:text-text',
    accent: 'qar:bg-accent qar:text-canvas',
    danger: 'qar:bg-danger qar:text-canvas',
  }[tone]
  return <span className={cn('qar:inline-flex qar:items-center qar:rounded-control qar:px-2 qar:py-1 qar:text-xs qar:font-medium', toneClass, className)} {...props} />
}

export type ProgressProps = ProgressPrimitive.ProgressProps & {
  valueLabel?: string
}

export function Progress({ value = 0, valueLabel, className, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      value={value}
      aria-label={valueLabel}
      className={cn('qar:h-2 qar:w-full qar:overflow-hidden qar:rounded-full qar:bg-border', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator className="qar:h-full qar:bg-accent qar:transition" style={{ transform: `translateX(-${100 - Number(value)}%)` }} />
    </ProgressPrimitive.Root>
  )
}

export type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  label?: string
}

export function Spinner({ label = 'Loading', className, ...props }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cn('qar:inline-block qar:size-4 qar:animate-spin qar:rounded-full qar:border-2 qar:border-border qar:border-t-accent', className)} {...props} />
  )
}
```

Expected: the only inline style is measured transform for progress value. If the design-literal check blocks it, add a narrow allowlist entry in `src-react/design-system/docs/measured-layout-allowlist.json`.

## Task 5: Level 2 Behavior Wrappers

**Files:**
- Create: `src-react/components/ui/tooltip.tsx`
- Create: `src-react/components/ui/overlays.tsx`
- Create: `src-react/components/ui/menus.tsx`
- Create: `src-react/components/ui/disclosure.tsx`

- [ ] **Step 1: Implement `Tooltip` wrapper**

Create `src-react/components/ui/tooltip.tsx`:

```tsx
import type { ReactNode } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '../../design-system/utils/cn'

export type TooltipProps = {
  label: string
  children: ReactNode
}

export function Tooltip({ label, children }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className={cn('qar:z-50 qar:rounded-control qar:border qar:border-border qar:bg-surface qar:px-2 qar:py-1 qar:text-xs qar:text-text qar:shadow-sm')} sideOffset={6}>
            {label}
            <TooltipPrimitive.Arrow className="qar:fill-surface" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
```

Expected: feature code never imports `@radix-ui/react-tooltip`.

- [ ] **Step 2: Implement overlay wrappers**

Create `src-react/components/ui/overlays.tsx`:

```tsx
import type { ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { Button } from './button'
import { cn } from '../../design-system/utils/cn'

type OverlayBaseProps = {
  title: string
  description?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
  children: ReactNode
}

function OverlayText({ title, description }: Pick<OverlayBaseProps, 'title' | 'description'>) {
  return (
    <header className="qar:space-y-1">
      <DialogPrimitive.Title className="qar:text-lg qar:font-semibold qar:text-text">{title}</DialogPrimitive.Title>
      {description ? <DialogPrimitive.Description className="qar:text-sm qar:text-muted">{description}</DialogPrimitive.Description> : null}
    </header>
  )
}

export type DialogProps = OverlayBaseProps
export function Dialog({ title, description, open, onOpenChange, trigger, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="qar:fixed qar:inset-0 qar:z-40 qar:bg-overlay" />
        <DialogPrimitive.Content className={cn('qar:fixed qar:left-1/2 qar:top-1/2 qar:z-50 qar:w-full qar:max-w-lg qar:-translate-x-1/2 qar:-translate-y-1/2 qar:space-y-4 qar:rounded-surface qar:border qar:border-border qar:bg-canvas qar:p-5 qar:text-text qar:shadow-lg')}>
          <OverlayText title={title} description={description} />
          {children}
          <DialogPrimitive.Close asChild><Button variant="ghost">Close</Button></DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export type SheetProps = OverlayBaseProps & { side?: 'bottom' | 'right' }
export function Sheet({ title, description, open, onOpenChange, trigger, children, side = 'bottom' }: SheetProps) {
  const sideClass = side === 'right'
    ? 'qar:right-0 qar:top-0 qar:h-full qar:w-full qar:max-w-sm'
    : 'qar:inset-x-0 qar:bottom-0 qar:max-h-full qar:rounded-t-surface'
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="qar:fixed qar:inset-0 qar:z-40 qar:bg-overlay" />
        <DialogPrimitive.Content className={cn('qar:fixed qar:z-50 qar:space-y-4 qar:border qar:border-border qar:bg-canvas qar:p-5 qar:text-text qar:shadow-lg', sideClass)}>
          <OverlayText title={title} description={description} />
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export type PopoverProps = OverlayBaseProps
export function Popover({ title, description, open, onOpenChange, trigger, children }: PopoverProps) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger> : null}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content sideOffset={8} className="qar:z-50 qar:w-72 qar:space-y-3 qar:rounded-surface qar:border qar:border-border qar:bg-canvas qar:p-4 qar:text-text qar:shadow-lg">
          <h2 className="qar:text-sm qar:font-semibold">{title}</h2>
          {description ? <p className="qar:text-sm qar:text-muted">{description}</p> : null}
          {children}
          <PopoverPrimitive.Arrow className="qar:fill-canvas" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export type ToastProps = {
  title: string
  description?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}

export function Toast({ title, description, open, onOpenChange, children }: ToastProps) {
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      <ToastPrimitive.Root open={open} onOpenChange={onOpenChange} className="qar:grid qar:gap-1 qar:rounded-surface qar:border qar:border-border qar:bg-canvas qar:p-4 qar:text-text qar:shadow-lg">
        <ToastPrimitive.Title className="qar:text-sm qar:font-semibold">{title}</ToastPrimitive.Title>
        {description ? <ToastPrimitive.Description className="qar:text-sm qar:text-muted">{description}</ToastPrimitive.Description> : null}
        {children}
      </ToastPrimitive.Root>
      <ToastPrimitive.Viewport className="qar:fixed qar:bottom-4 qar:right-4 qar:z-50 qar:grid qar:w-full qar:max-w-sm qar:gap-2" />
    </ToastPrimitive.Provider>
  )
}
```

Expected: modal/sheet focus trapping stays Radix-owned and feature code receives a narrow API.

- [ ] **Step 3: Implement menu wrappers**

Create `src-react/components/ui/menus.tsx`:

```tsx
import type { ReactNode } from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../../design-system/utils/cn'

export type DropdownMenuProps = {
  label: string
  trigger: ReactNode
  items: Array<{ id: string; label: string; disabled?: boolean; onSelect?: () => void }>
}

export function DropdownMenu({ label, trigger, items }: DropdownMenuProps) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild aria-label={label}>{trigger}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content sideOffset={8} className="qar:z-50 qar:min-w-44 qar:rounded-surface qar:border qar:border-border qar:bg-canvas qar:p-1 qar:text-text qar:shadow-lg">
          {items.map((item) => (
            <DropdownMenuPrimitive.Item key={item.id} disabled={item.disabled} onSelect={item.onSelect} className="qar:rounded-control qar:px-3 qar:py-2 qar:text-sm qar:outline-none qar:focus:bg-surface qar:disabled:opacity-50">
              {item.label}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

export type TabsProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  tabs: Array<{ value: string; label: string; content: ReactNode }>
}

export function Tabs({ label, value, onValueChange, tabs }: TabsProps) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange}>
      <TabsPrimitive.List aria-label={label} className="qar:flex qar:gap-1 qar:rounded-control qar:border qar:border-border qar:bg-surface qar:p-1">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger key={tab.value} value={tab.value} className="qar:rounded-control qar:px-3 qar:py-2 qar:text-sm qar:text-muted qar:data-[state=active]:bg-canvas qar:data-[state=active]:text-text">
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content key={tab.value} value={tab.value} className="qar:mt-3">
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}

export type AccordionProps = {
  items: Array<{ value: string; title: string; content: ReactNode }>
  type?: 'single' | 'multiple'
}

export function Accordion({ items, type = 'single' }: AccordionProps) {
  const content = items.map((item) => (
    <AccordionPrimitive.Item key={item.value} value={item.value}>
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger className="qar:flex qar:w-full qar:items-center qar:justify-between qar:px-4 qar:py-3 qar:text-left qar:text-sm qar:font-medium qar:text-text">
          {item.title}
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="qar:px-4 qar:pb-4 qar:text-sm qar:text-muted">
        {item.content}
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  ))
  if (type === 'multiple') {
    return <AccordionPrimitive.Root type="multiple" className="qar:divide-y qar:divide-border qar:rounded-surface qar:border qar:border-border">{content}</AccordionPrimitive.Root>
  }
  return (
    <AccordionPrimitive.Root type="single" collapsible className="qar:divide-y qar:divide-border qar:rounded-surface qar:border qar:border-border">
      {content}
    </AccordionPrimitive.Root>
  )
}

export type CommandProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string; disabled?: boolean }>
  className?: string
}

export function Command({ label, value, onValueChange, options, className }: CommandProps) {
  return (
    <label className={cn('qar:grid qar:gap-2 qar:text-sm qar:text-text', className)}>
      <span className="qar:font-medium">{label}</span>
      <input
        role="combobox"
        aria-expanded="true"
        aria-controls="qa-command-options"
        value={value}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        className="qar:min-h-10 qar:rounded-control qar:border qar:border-border qar:bg-canvas qar:px-3 qar:text-text qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-focus"
      />
      <ul id="qa-command-options" role="listbox" className="qar:max-h-56 qar:overflow-auto qar:rounded-surface qar:border qar:border-border">
        {options.map((option) => (
          <li key={option.value} role="option" aria-selected={option.value === value} className={cn('qar:px-3 qar:py-2 qar:text-sm', option.value === value ? 'qar:bg-surface' : '')}>
            {option.label}
          </li>
        ))}
      </ul>
    </label>
  )
}
```

If current Radix docs provide a suitable Command primitive during implementation, replace the local `Command` internals with that primitive while preserving this public API, then document the behavior source in `src-react/design-system/docs/components.md`.

Expected: feature code has registered behavior wrappers before product surfaces compose menus, tabs, accordions, or command palettes.

- [ ] **Step 4: Implement disclosure helper**

Create `src-react/components/ui/disclosure.tsx` with a keyboard-reachable button and region pair:

```tsx
import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from './button'

export type DisclosureProps = {
  label: string
  defaultOpen?: boolean
  children: ReactNode
}

export function Disclosure({ label, defaultOpen = false, children }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()

  return (
    <section>
      <Button aria-expanded={open} aria-controls={id} variant="ghost" onClick={() => setOpen((value) => !value)}>
        {label}
      </Button>
      <div id={id} hidden={!open}>
        {children}
      </div>
    </section>
  )
}
```

Expected: simple disclosure use cases do not hand-roll focus-sensitive toggles in feature code.

## Task 6: Static Radix Boundary Check

**Files:**
- Create: `scripts/check-react-radix-boundaries.mjs`
- Create: `tests/unit/react-components/check-react-radix-boundaries.test.mjs`

- [ ] **Step 1: Add scanner**

Create `scripts/check-react-radix-boundaries.mjs`:

```js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const allowedPrefix = path.join(repoRoot, 'src-react', 'components', 'ui') + path.sep
const scannedRoots = [path.join(repoRoot, 'src-react')]

export function findRadixBoundaryViolations(root = repoRoot) {
  const violations = []
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
        continue
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue
      const text = fs.readFileSync(fullPath, 'utf8')
      if (text.includes('@radix-ui/') && !fullPath.startsWith(allowedPrefix.replace(repoRoot, root))) {
        violations.push(path.relative(root, fullPath))
      }
    }
  }
  for (const scanRoot of scannedRoots) {
    walk(scanRoot.replace(repoRoot, root))
  }
  return violations.sort()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const violations = findRadixBoundaryViolations()
  if (violations.length > 0) {
    console.error(`Direct Radix imports are allowed only in src-react/components/ui/**:\n${violations.join('\n')}`)
    process.exit(1)
  }
}
```

Expected: the script fails when feature/page code imports Radix directly.

- [ ] **Step 2: Add scanner tests**

Create `tests/unit/react-components/check-react-radix-boundaries.test.mjs`:

```js
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { findRadixBoundaryViolations } from '../../../scripts/check-react-radix-boundaries.mjs'

let tempDir

afterEach(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true })
  tempDir = undefined
})

function write(file, text) {
  const fullPath = path.join(tempDir, file)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, text)
}

describe('check-react-radix-boundaries', () => {
  it('allows Radix imports in owned UI wrappers', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-radix-ok-'))
    write('src-react/components/ui/dialog.tsx', "import * as Dialog from '@radix-ui/react-dialog'\n")

    expect(findRadixBoundaryViolations(tempDir)).toEqual([])
  })

  it('blocks Radix imports outside owned UI wrappers', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-radix-bad-'))
    write('src-react/app/routes/settings.tsx', "import * as Dialog from '@radix-ui/react-dialog'\n")

    expect(findRadixBoundaryViolations(tempDir)).toEqual(['src-react/app/routes/settings.tsx'])
  })
})
```

Expected: negative fixture proves the check would block direct feature-code Radix use.

## Task 7: Stories, Tests, And Component Docs

**Files:**
- Create: `src-react/components/ui/ui.stories.tsx`
- Create: `tests/unit/react-components/ui-components.test.tsx`
- Create: `src-react/design-system/docs/components.md`

- [ ] **Step 1: Add Storybook coverage**

Create `src-react/components/ui/ui.stories.tsx` with stories for:

- `Button`: primary, secondary, ghost, danger, disabled, busy.
- `IconButton`: tooltip-wrapped and disabled.
- `Input`, `Textarea`, `Select`: default, disabled, invalid via `aria-invalid`.
- `SegmentedControl`, `Checkbox`, `Switch`, `Slider`: keyboard-reachable states.
- `Badge`, `Progress`, `Spinner`: neutral/accent/danger and status states.
- `Tooltip`, `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Tabs`, `Accordion`, `Toast`, `Command`, `Disclosure`: default open/closed and focusable examples.

Expected: every exported component from `src-react/components/ui/index.ts` appears in at least one story.

- [ ] **Step 2: Add component tests**

Create `tests/unit/react-components/ui-components.test.tsx` covering:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button, Checkbox, Disclosure, IconButton, SegmentedControl, Spinner, Switch } from '../../../src-react/components/ui'

describe('owned UI components', () => {
  it('disables busy buttons and exposes busy state', () => {
    render(<Button busy>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('requires an accessible name for icon buttons', () => {
    render(<IconButton label="Open settings" icon={<span aria-hidden="true">i</span>} />)
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeInTheDocument()
  })

  it('updates segmented control through its typed change handler', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SegmentedControl label="Reader mode" value="verse" options={[{ value: 'verse', label: 'Verse' }, { value: 'mushaf', label: 'Mushaf' }]} onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: 'Mushaf' }))
    expect(onChange).toHaveBeenCalledWith('mushaf')
  })

  it('renders status text for spinners', () => {
    render(<Spinner label="Installing pack" />)
    expect(screen.getByRole('status', { name: 'Installing pack' })).toBeInTheDocument()
  })

  it('toggles disclosure regions with aria-expanded', async () => {
    const user = userEvent.setup()
    render(<Disclosure label="More options"><p>Hidden content</p></Disclosure>)
    const button = screen.getByRole('button', { name: 'More options' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Hidden content')).toBeVisible()
  })

  it('exposes accessible names for Radix-backed toggles', () => {
    render(
      <>
        <Checkbox label="Enable tafsir" />
        <Switch label="Night mode" />
      </>,
    )
    expect(screen.getByRole('checkbox', { name: 'Enable tafsir' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Night mode' })).toBeInTheDocument()
  })
})
```

Expected: tests prove typed APIs, busy/disabled semantics, accessible names, and basic keyboard-reachable state.

- [ ] **Step 3: Add ownership docs**

Create `src-react/design-system/docs/components.md`:

```markdown
# React Component Ownership

The React UI layer is QuranAtlas-owned source. shadcn/ui may be used as a copy-in reference, but copied files must be normalized to QuranAtlas semantic tokens, typed APIs, stories, tests, and registry entries before product code can consume them.

## Rules

- Import components from `src-react/components/ui`.
- Do not import Radix primitives outside `src-react/components/ui/**`.
- Do not pass raw Tailwind class fragments for normal product variants.
- Add a component variant when product code needs a repeated visual or behavior state.
- Add or update the component registry, stories, tests, and visual proof in the same change as any component addition.
- Keep React components under `src-react/**`; do not import from Svelte `src/**`.

## Initial Components

Level 1 primitives: `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `SegmentedControl`, `Checkbox`, `Switch`, `Slider`, `Badge`, `Progress`, `Spinner`, `Tooltip`.

Level 2 behavior wrappers: `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Tabs`, `Accordion`, `Toast`, `Command`, `Disclosure`.
```

Expected: future agents have a concise local handoff until plan `07` adds the machine-readable registry.

## Task 8: Verification, Commit, And Handoff

**Files:**
- Verify: all files created or modified by this plan

- [ ] **Step 1: Run targeted component checks**

Run:

```bash
pnpm run check:react:radix
pnpm run test:react -- tests/unit/react-components/ui-components.test.tsx tests/unit/react-components/check-react-radix-boundaries.test.mjs
pnpm run test:storybook:react
```

Expected: Radix boundary check, component tests, and Storybook tests pass.

- [ ] **Step 2: Run React and docs gates**

Run:

```bash
pnpm run check:react
pnpm run build:react
pnpm run docs:check
git diff --check
```

Expected: React remains isolated in `dist-react/`, docs are current, and whitespace check passes.

- [ ] **Step 3: Run Svelte safety gate when package/check tooling changed**

Run:

```bash
pnpm run check
```

Expected: existing shipped Svelte static checks still pass.

- [ ] **Step 4: Review final diff scope**

Run:

```bash
git diff --name-only
```

Expected: only allowed React component, script, docs, package, and config files changed. No `src/**`, `src/styles/**`, `public/dataset/**`, or Wave 1 plan files changed.

- [ ] **Step 5: Commit**

Run:

```bash
git add components.json package.json pnpm-lock.yaml docs/tech-stack.md docs/context/repo-structure.md src-react/components/ui src-react/design-system/utils src-react/design-system/docs/components.md scripts/check-react-radix-boundaries.mjs tests/unit/react-components
git commit -m "feat: add owned react ui component layer"
```

Expected: commit succeeds. Do not push.

## Handoff To Plan 07

Plan `07` must register every component delivered here before product components or page recipes can consume them. If a component from the 06 spec was intentionally not delivered, record the missing component name, reason, and owner in `src-react/design-system/docs/components.md` before starting plan `07`.
