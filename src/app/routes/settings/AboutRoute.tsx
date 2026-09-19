import { ChevronRight, ExternalLink } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import pkg from '../../../../package.json'
import { SettingsShell } from '../../../components/settings/SettingsShell'
import { ChoiceButton } from '../../../components/ui'
import { InstallAppSection } from '../../../components/settings/InstallAppSection'

const sources: Array<{ content: ReactNode; id: string }> = [
  {
    content: (
      <>
        Qur’an text (Qalūn riwayah):{' '}
        <a href="https://qurancomplex.gov.sa/en/techquran/dev/" rel="noreferrer" target="_blank">
          King Fahd Complex source
        </a>{' '}
        (
        <span dir="rtl" lang="ar" className="qar:whitespace-nowrap">
          مجمع الملك فهد لطباعة المصحف الشريف
        </span>
        ), Madinah. KFGQPC Quran text source; restricted terms apply.
      </>
    ),
    id: 'quran-text',
  },
  {
    content: (
      <>
        English translation: Bridges — Fadel Soliman ({' '}
        <a href="https://qul.tarteel.ai/resources/translation/179" rel="noreferrer" target="_blank">
          Bridges translation source
        </a>
        ). QUL downloadable resource.
      </>
    ),
    id: 'translation',
  },
  {
    content: (
      <>
        Mushaf editions: <span>Qalun Quran.ws (minimal monochrome pages)</span> —{' '}
        <a href="https://quran.ws" rel="noreferrer" target="_blank">
          Quran.ws page source
        </a>
        . Quran.ws page assets free use. Qalun Furatiyyah 2023 uses coloured notation and marginal notes; its
        private-source redistribution is limited to the user-authorized QuranAtlas noncommercial deployment.{' '}
        <a
          href="https://github.com/Omar-MD/QuranAtlas/blob/dev/data/catalog/mushaf-assets.json"
          rel="noreferrer"
          target="_blank"
        >
          Furatiyyah source record
        </a>
        .
      </>
    ),
    id: 'editions',
  },
  {
    content: (
      <>
        Arabic typography: KFGQPC Uthmanic Qaloon ({' '}
        <a href="https://qurancomplex.gov.sa/en/techquran/dev/" rel="noreferrer" target="_blank">
          King Fahd Complex typography source
        </a>
        ). Latin: Newsreader (SIL Open Font License).
      </>
    ),
    id: 'typography',
  },
]

// About renders as an overlay above the reader (desktop dialog, mobile
// full-screen cover). It carries identity, provenance, and support only —
// lifecycle actions (install, updates, clear data) live in the Settings
// "App" group, and the notation guide lives beside the reading controls.
export function AboutRoute({ onClose, returnFocusId }: { onClose: () => void; returnFocusId?: string }) {
  const [sourcesOpen, setSourcesOpen] = useState(false)

  return (
    <SettingsShell closeLabel="Close about" onClose={onClose} returnFocusId={returnFocusId} subtitle="" title="About">
      {/* About calm sheet: tagline → sources disclosure → quiet report link →
          version footer. The footer's top border is the single hairline on
          the screen. */}
      <div className="qar-about-page qar:mx-auto qar:grid qar:w-full qar:max-w-xl">
        <p className="qar:m-0 qar:text-base qar:font-medium">Read, reflect, remember.</p>

        {/* G-7: the disclosure row idiom; the attribution fine print lives
            inside its expanded content. */}
        <div className="qar:grid qar:gap-2">
          <ChoiceButton
            aria-controls="about-sources-content"
            aria-expanded={sourcesOpen}
            className="qar-disclosure-row"
            data-testid="sources-licenses-button"
            onClick={() => setSourcesOpen((open) => !open)}
          >
            <span className="qar-disclosure-row-copy">Sources and licenses</span>
            <ChevronRight aria-hidden="true" className="qar-disclosure-row-chevron" size={16} strokeWidth={1.7} />
          </ChoiceButton>
          {sourcesOpen ? (
            <div className="qar:grid qar:gap-2" id="about-sources-content">
              <ul className="qar:m-0 qar:grid qar:gap-2 qar:list-disc qar:pl-5 qar:text-sm qar:leading-6 qar:text-muted qar:marker:text-muted">
                {sources.map((source) => (
                  <li key={source.id}>{source.content}</li>
                ))}
              </ul>
              <p className="qar:m-0 qar:text-xs qar:leading-5 qar:text-muted">Built with React, Vite, and Workbox.</p>
              <div className="qar-about-fine-print qar:text-muted">
                <p className="qar:m-0">Qalūn text · KFGQPC restricted terms.</p>
                <p className="qar:m-0">Bridges · Fadel Soliman / QUL.</p>
                <p className="qar:m-0">Quran.ws · free use; Furatiyyah 2023 · noncommercial.</p>
                <p className="qar:m-0">KFGQPC Uthmanic Qaloon · Newsreader (OFL).</p>
              </div>
            </div>
          ) : null}
        </div>

        <a
          className="qar:flex qar:min-h-11 qar:items-center qar:gap-1 qar:justify-self-start qar:text-sm qar:text-muted"
          href="https://github.com/Omar-MD/QuranAtlas/issues"
          rel="noreferrer"
          target="_blank"
        >
          Report an issue
          <ExternalLink aria-hidden="true" size={14} strokeWidth={1.7} />
        </a>

        <footer className="qar:grid qar:gap-3 qar:border-t qar:border-border qar:pt-3">
          <p className="qar:m-0 qar:text-sm qar:text-muted" data-testid="about-version">
            Version {pkg.version}
          </p>
          <InstallAppSection placement="about" />
        </footer>
      </div>
    </SettingsShell>
  )
}
