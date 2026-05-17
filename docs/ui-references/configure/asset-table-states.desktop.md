Component: Asset table state rows
State and viewport: Desktop-width table rows covering required state variants.

Accepted visual traits: table rows are dense and operational with columns for name, details, size, status, and actions. Shipped compatible inactive rows use Set Active, not Install. Active delete blocking, incompatible riwayah/variant reasons, unavailable check-again behavior, and install progress are visible without relying on color alone.

Forbidden traits: no app-version/update-required compatibility copy, no Install action for Shipped assets, no hidden active-delete reason, no pause icon as the only progress action, no command/search affordance, and no marketing dashboard styling.

Token expectations: use semantic tokens for table dividers, status text, bronze actions, warning/error/progress state, focus indicators, disabled actions, and readable desktop density.

Responsive differences: desktop uses table rows. Mobile uses the paired stacked row-state reference.

Non-goals: this reference does not define exact table column widths, final asset names, or permanent byte values.
