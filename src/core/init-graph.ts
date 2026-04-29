// Boot-time dependency runner. Audit R-12 / CC-8 (2026-04-29) flagged
// app-bootstrap.ts as ~487 lines of sequenced init* calls where the
// ordering constraint between e.g. initRiwayah → initReadingTypography
// (line-height clamp depends on the riwayah floor) was a comment, not
// a typed contract. Every future-work item adds an init* call; the
// next contributor eyeballs line ordering and gets it wrong.
//
// Each node declares its name, its declared deps, and an init function
// that may return a cleanup. boot() runs nodes in a topological order
// where every dep finishes before its dependents start. The graph is
// strict: registering a node that depends on a not-yet-registered name
// is fine (we sort once at boot() time), but cycles or missing deps at
// boot time throw — surfaced loudly so future inits can't silently
// degrade the launch path.
//
// Cleanup: boot() returns the cleanup functions in reverse-topological
// order; app-bootstrap.ts pushes them onto its existing bootCleanups
// stack (consumed by the disposer when the app shell is torn down).

export type InitNode = {
  name: string
  deps?: readonly string[]
  init: () => Promise<(() => void) | void> | (() => void) | void
}

const nodes: Map<string, InitNode> = new Map()

export function register(node: InitNode): void {
  if (nodes.has(node.name)) {
    throw new Error(`init-graph: duplicate node '${node.name}'`)
  }
  nodes.set(node.name, node)
}

export function reset(): void {
  nodes.clear()
}

function topoOrder(): string[] {
  // Kahn's algorithm. Stable order: when multiple nodes have all deps
  // satisfied, pick them in registration order (Map iteration order).
  const indegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()
  for (const name of nodes.keys()) {
    indegree.set(name, 0)
    dependents.set(name, [])
  }
  for (const node of nodes.values()) {
    for (const dep of node.deps ?? []) {
      if (!nodes.has(dep)) {
        throw new Error(`init-graph: node '${node.name}' depends on '${dep}' which is not registered`)
      }
      indegree.set(node.name, (indegree.get(node.name) ?? 0) + 1)
      dependents.get(dep)!.push(node.name)
    }
  }

  const ready: string[] = []
  for (const [name, deg] of indegree) {
    if (deg === 0) ready.push(name)
  }

  const out: string[] = []
  while (ready.length > 0) {
    const name = ready.shift()!
    out.push(name)
    for (const dependent of dependents.get(name) ?? []) {
      const next = (indegree.get(dependent) ?? 0) - 1
      indegree.set(dependent, next)
      if (next === 0) ready.push(dependent)
    }
  }

  if (out.length !== nodes.size) {
    const stuck = [...nodes.keys()].filter((n) => !out.includes(n))
    throw new Error(`init-graph: cycle detected; unresolved nodes: ${stuck.join(', ')}`)
  }
  return out
}

/**
 * Run all registered nodes in topological order. Returns the cleanup
 * functions in reverse-topological order so the caller can append them
 * to a teardown stack.
 */
export async function boot(): Promise<Array<() => void>> {
  const order = topoOrder()
  const cleanups: Array<() => void> = []
  for (const name of order) {
    const node = nodes.get(name)!
    const result = await node.init()
    if (typeof result === 'function') {
      cleanups.unshift(result)
    }
  }
  return cleanups
}

// Test-only escape hatch: run a single node by name (used by unit
// tests that exercise individual nodes without standing up the whole
// graph).
export async function runNodeForTest(name: string): Promise<void> {
  const node = nodes.get(name)
  if (!node) throw new Error(`init-graph: no node '${name}'`)
  await node.init()
}
