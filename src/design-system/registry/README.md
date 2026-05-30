# React Component Registry

The registry is the machine-readable source for React component ownership. Add
or update an entry whenever a React component, product component, or page recipe
becomes part of the approved composition surface.

Rules:

- Keep entries sorted by `id`.
- Every registered component needs a stable named export under `src/**`.
- Feature code imports from `src/components/ui`, not Radix directly.
- Stories and tests listed in the registry must exist.
- Visual proof is regression evidence only; committed UI references remain the
  visual source of truth when present.
