Component: Asset row state stack
State and viewport: Mobile-width asset rows covering required state variants.

Accepted visual traits: rows use one dense ledger grammar with status, compatibility reason, progress, primary action, and overflow/secondary-action affordance. Shipped compatible inactive rows use Set Active rather than Install. Active rows expose Delete as disabled with the reason "Switch to another compatible asset before deleting." Incompatible rows explain riwayah/variant compatibility and have no primary action.

Forbidden traits: no app-version/update-required compatibility copy, no Install action for Shipped assets, no pause-only progress action unless cancellation is supported, no hidden disabled reasons, no search/command affordance, and no random generated statuses.

Token expectations: use semantic tokens for row surfaces, status chips, bronze actions, warning/error colors, progress, focus ring, disabled text, and 44px touch targets.

Responsive differences: mobile stacks rows in one column with concise metadata. Desktop uses the paired table-state reference.

Non-goals: this reference does not define final asset names, byte values, or overflow menu implementation details.
