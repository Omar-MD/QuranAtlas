Component: Asset Management status live region
State and viewport: Mobile-width route-level status strip variants for `#/assets`.

Accepted visual traits: compact status strips sit below the active variant summary and announce idle verification, install progress, user-action errors, and completion. Copy is short enough to avoid pushing asset rows too far down.

Forbidden traits: no oversized alert banners, no marketing copy, no hidden progress/errors, no command/search affordance, and no color-only state.

Token expectations: use semantic tokens for info/success/warning/error surfaces, borders, focusable retry action, text, and `aria-live` status placement.

Responsive differences: mobile stacks one strip at a time. Desktop may place the same live status near the page header or table toolbar while preserving the same copy hierarchy.

Non-goals: this reference does not define final announcer implementation or all possible network error messages.
