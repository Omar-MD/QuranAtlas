# React Story Requirements

Storybook is proof evidence, not visual source of truth. Committed
`docs/ui-references/**` images and notes remain visual intent references where
they exist.

Level 1 primitives and Level 2 behavior components need stories for:

- default
- focus-visible
- disabled where reachable
- loading or busy where reachable
- error or invalid where reachable
- mobile and desktop viewport proof
- light, sepia, and dark themes

Level 3 product components and Level 4 page recipes also need:

- offline state
- long Arabic/translation text where relevant
- empty state
- error state
- reduced-motion proof for motion-sensitive behavior
