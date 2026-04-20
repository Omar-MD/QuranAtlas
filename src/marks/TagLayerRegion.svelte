<script lang="ts">
  import TagChip from './TagChip.svelte'
  import { validateTagLabel } from '../safety/input-validator'

  interface Props {
    label: string
    selected: string[]
    all: string[]
    collapsed: boolean
  }

  let { label, selected = $bindable(), all = $bindable(), collapsed = $bindable() }: Props = $props()

  let query = $state('')
  const q = $derived(query.trim().toLowerCase())
  const selectedSet = $derived(new Set(selected))
  const unselected = $derived(all.filter(t => !selectedSet.has(t)))
  const filtered = $derived(q ? unselected.filter(t => t.toLowerCase().includes(q)) : unselected)

  const createLabel = $derived((): string | null => {
    if (!q) return null
    if (all.some(t => t.toLowerCase() === q)) return null
    const v = validateTagLabel(q)
    return v.valid ? v.label : null
  })

  function toggle(tag: string) {
    if (selectedSet.has(tag)) {
      selected = selected.filter(t => t !== tag)
    } else {
      selected = [...selected, tag]
    }
  }

  function create(newLabel: string) {
    if (!all.includes(newLabel)) all = [...all, newLabel]
    selected = [...selected, newLabel]
    query = ''
  }
</script>

<section class="qa-layer-region" data-layer={label.toLowerCase()}>
  <header class="qa-layer-header">
    <button type="button" class="qa-layer-toggle" onclick={() => collapsed = !collapsed} aria-expanded={!collapsed}>
      <span class="qa-layer-chevron">{collapsed ? '▸' : '▾'}</span>
      <span class="qa-layer-label">{label}</span>
      <span class="qa-layer-count">{selected.length}</span>
    </button>
  </header>
  {#if !collapsed}
    <div class="qa-layer-selected">
      {#each selected as tag (tag)}
        <TagChip {tag} selected ontoggle={() => toggle(tag)} />
      {/each}
    </div>
    <input
      type="search"
      class="qa-layer-search"
      bind:value={query}
      placeholder="Search or create"
      maxlength={50}
    />
    <div class="qa-layer-all">
      {#each filtered as tag (tag)}
        <TagChip {tag} ontoggle={() => toggle(tag)} />
      {/each}
      {#if createLabel()}
        <TagChip tag={`+ ${createLabel()}`} create ontoggle={() => create(createLabel()!)} />
      {/if}
    </div>
  {/if}
</section>

<style>
  .qa-layer-region { margin-bottom: 10px; }
  .qa-layer-toggle {
    display: flex; align-items: center; gap: 6px;
    width: 100%; padding: 6px 8px;
    background: transparent; border: none;
    color: var(--qa-ambient-accent);
    font-size: 0.6875rem; text-transform: uppercase;
    letter-spacing: 0.08em; cursor: pointer;
  }
  .qa-layer-count {
    margin-left: auto;
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--qa-ambient-accent);
    color: var(--qa-on-accent);
    font-size: 0.625rem;
  }
  .qa-layer-selected,
  .qa-layer-all {
    display: flex; flex-wrap: wrap; gap: 5px; padding: 4px;
  }
  .qa-layer-search {
    width: 100%;
    padding: 7px 10px;
    border: 1px solid var(--qa-ambient-border);
    border-radius: 8px;
    background: var(--qa-bg-primary);
    color: var(--qa-ambient-parchment);
    font: inherit; font-size: 0.8125rem;
    margin: 6px 0;
  }
</style>
