<script lang="ts">
  import { onMount } from 'svelte'
  import { getAll } from '../marks/store'
  import { announce } from '../a11y/announcer'
  import { getInstallPrompt, promptInstall } from './pwa-install'

  let marks = $state(0)
  let tags = $state(0)
  let surahs = $state(0)
  let pctTagged = $state('0.00')
  let statsLoaded = $state(false)
  let installAvailable = $state(false)
  let installDone = $state(false)

  const credits = [
    "Quran translation by Fadel Soliman (Bridges' Translation)",
    'Arabic typography by KFGQPC (King Fahd Glyphic and Typographic Project)',
    'Font: Scheherazade New (SIL Open Font License)',
    'Built with Svelte, Vite, and Workbox',
  ]

  onMount(async () => {
    installAvailable = !!getInstallPrompt()
    try {
      const allMarks = await getAll()
      marks = allMarks.length
      tags = new Set(allMarks.flatMap(m => m._canon.threads)).size
      surahs = new Set(allMarks.map(m => parseInt(m.verseKey.split(':')[0] ?? '0', 10))).size
      pctTagged = ((allMarks.length / 6236) * 100).toFixed(2)
      statsLoaded = true
    } catch {
      statsLoaded = true // leave as zeros
    }
    announce('About page')
  })

  async function handleInstall() {
    const outcome = await promptInstall()
    if (outcome === 'accepted') {
      installDone = true
      announce('App installed')
    }
  }
</script>

<h1 class="qa-about-heading">QuranAtlas</h1>
<p class="qa-about-mission">Read, reflect, remember.</p>

<div class="qa-about-blessing-wrap">
  <p class="qa-about-blessing" dir="rtl" lang="ar">وَلَقَدۡ يَسَّرۡنَا ٱلۡقُرۡءَانَ لِلذِّكۡرِ فَهَلۡ مِن مُّدَّكِرٍ</p>
  <p class="qa-about-blessing-translation">"And We have certainly made the Qur'an easy for remembrance, so is there any who will remember?" — 54:17</p>
</div>

<div class="qa-about-stat-grid">
  <div class="qa-about-stat-cell"><span class="qa-about-stat-value">{statsLoaded ? marks : '—'}</span><span class="qa-about-stat-label">Marks</span></div>
  <div class="qa-about-stat-cell"><span class="qa-about-stat-value">{statsLoaded ? tags : '—'}</span><span class="qa-about-stat-label">Tags</span></div>
  <div class="qa-about-stat-cell"><span class="qa-about-stat-value">{statsLoaded ? surahs : '—'}</span><span class="qa-about-stat-label">Surahs</span></div>
  <div class="qa-about-stat-cell"><span class="qa-about-stat-value">{statsLoaded ? `${pctTagged}%` : '—'}</span><span class="qa-about-stat-label">% Qur'an</span></div>
</div>

<div class="qa-about-body-split">
  <section class="qa-about-attribution">
    <h2 class="qa-about-section-title">Attribution</h2>
    <ul class="qa-about-attr-list">
      {#each credits as credit (credit)}
        <li>{credit}</li>
      {/each}
    </ul>
  </section>
  <div>
    {#if installAvailable}
      <section class="qa-about-install">
        <button
          class="qa-about-install-btn"
          aria-label="Install QuranAtlas to your home screen"
          disabled={installDone}
          onclick={handleInstall}
        >
          {installDone ? 'Installed!' : 'Install App'}
        </button>
      </section>
    {/if}
    <p class="qa-about-version-line">v{__APP_VERSION__}</p>
  </div>
</div>

<style>
  .qa-about-heading {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--qa-text-primary);
    margin-bottom: 0.25rem;
  }

  .qa-about-mission {
    font-size: 1.125rem;
    color: var(--qa-text-secondary);
    font-style: italic;
    margin-bottom: 2.5rem;
  }

  .qa-about-section-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--qa-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.75rem;
  }

  .qa-about-blessing-wrap {
    margin: 2rem 0;
    padding: 1.5rem;
    border: 1px solid var(--qa-ambient-border);
    border-radius: var(--qa-radius-xl);
    background-color: var(--qa-ambient-surface);
    text-align: center;
  }

  .qa-about-blessing {
    font-family: 'Scheherazade New', 'Amiri', serif;
    font-size: 1.25rem;
    line-height: 2;
    color: var(--qa-ambient-parchment);
    margin: 0 0 0.75rem;
  }

  .qa-about-blessing-translation {
    font-size: var(--qa-text-size-meta);
    color: var(--qa-ambient-muted);
    font-style: italic;
    margin: 0;
    line-height: 1.6;
  }

  .qa-about-stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin: 2rem 0;
  }

  .qa-about-stat-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    background-color: var(--qa-ambient-surface);
    border: 1px solid var(--qa-ambient-border);
    border-radius: var(--qa-radius-xl);
    gap: 0.25rem;
  }

  .qa-about-stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--qa-ambient-accent);
    line-height: 1;
  }

  .qa-about-stat-label {
    font-size: var(--qa-text-size-meta);
    color: var(--qa-ambient-muted);
    text-align: center;
  }

  .qa-about-version-line {
    font-size: var(--qa-text-size-meta);
    color: var(--qa-ambient-dim);
    text-align: center;
    margin: 1rem 0 0.5rem;
  }

  .qa-about-attribution {
    margin-bottom: 2rem;
  }

  .qa-about-attr-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .qa-about-attr-list li {
    font-size: var(--qa-text-size-meta);
    color: var(--qa-text-secondary);
    padding-left: 1rem;
    position: relative;
  }

  .qa-about-attr-list li::before {
    content: "·";
    position: absolute;
    left: 0;
    color: var(--qa-ambient-accent);
    font-weight: 700;
  }

  .qa-about-install {
    margin-bottom: 2rem;
  }

  .qa-about-install-btn {
    width: 100%;
    padding: 1rem;
    border-radius: var(--qa-radius-xl);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    background-color: var(--qa-ambient-accent);
    color: var(--qa-on-accent);
    border: none;
    transition: background-color var(--qa-transition-base), opacity var(--qa-transition-base);
  }

  .qa-about-install-btn:hover {
    background-color: var(--qa-accent-hover);
  }

  .qa-about-install-btn:disabled {
    opacity: 0.6;
    cursor: default;
  }

  @media (min-width: 1180px) {
    :global(#main-content:has(> .qa-about-heading)) {
      max-width: 1000px;
    }

    .qa-about-heading,
    .qa-about-mission {
      text-align: center;
    }
    .qa-about-heading { font-size: 2rem; }
    .qa-about-mission { font-size: 1.125rem; margin-bottom: 2rem; }

    .qa-about-blessing-wrap {
      max-width: 720px;
      margin: 0 auto 2rem;
      padding: 1.75rem 1.5rem;
    }

    .qa-about-stat-grid {
      grid-template-columns: repeat(4, 1fr);
      margin: 2rem 0 2.5rem;
    }

    .qa-about-body-split {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 260px;
      column-gap: 2.5rem;
      align-items: start;
    }
    .qa-about-body-split .qa-about-attribution { margin-bottom: 0; }
    .qa-about-body-split .qa-about-install { margin-bottom: 0; }
    .qa-about-body-split .qa-about-version-line { text-align: left; margin-top: 0.75rem; }
  }
</style>
