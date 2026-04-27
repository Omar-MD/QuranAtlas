<script lang="ts">
  import { getColorForTag } from './tags'

  interface Props {
    tag: string
    selected?: boolean
    dim?: boolean
    create?: boolean
    ontoggle?: () => void
  }

  const { tag, selected = false, dim = false, create = false, ontoggle }: Props = $props()
  const color = $derived(create ? '' : getColorForTag(tag))
</script>

<button
  type="button"
  class="qa-mark-chip"
  class:qa-mark-chip--on={selected}
  class:qa-mark-chip--dim={dim}
  class:qa-mark-chip--create={create}
  onclick={ontoggle}
>
  {#if !create}
    <span class="qa-mark-chip-dot" style:background-color={color}></span>
  {/if}
  {tag}
  {#if selected}
    <span class="qa-mark-chip-x" aria-hidden="true">×</span>
  {/if}
</button>

