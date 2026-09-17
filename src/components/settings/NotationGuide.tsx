import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { ChoiceButton, Dialog, Sheet } from '../ui'

export function NotationGuideButton() {
  const [open, setOpen] = useState(false)
  const guide = (
    <div className="qar:grid qar:gap-3">
      <h3 className="qar:m-0 qar:text-sm qar:font-semibold qar:leading-6 qar:text-text">Numbering and references</h3>
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        This translation renders one passage across several verses. Verse references follow the Hafs counting; the
        printed Qalūn edition may number these verses differently. Nothing is missing or repeated — the words are the
        same. Furatiyyah page numbers are the edition's own printed pagination, and page-start references are mapped to
        the nearest printed page.
      </p>
      <p className="qar:m-0 qar:text-sm qar:font-semibold qar:leading-6 qar:text-text">
        Notation conventions differ between printed editions.
      </p>
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        The page-image sources in this build do not include an edition-authorized legend, so QuranAtlas does not guess
        at a mark&apos;s meaning. Consult the legend supplied with your printed edition or a qualified teacher.
      </p>
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        This applies to both Qalun Quran.ws and Qalun Furatiyyah 2023 pages.
      </p>
    </div>
  )
  const [isDesktop] = useState(
    () => typeof window === 'undefined' || Boolean(window.matchMedia?.('(min-width: 768px)').matches),
  )
  return (
    <>
      <ChoiceButton
        aria-haspopup="dialog"
        className="qar-about-notation-row"
        data-testid="notation-guide-button"
        onClick={() => setOpen(true)}
      >
        <span className="qar-about-notation-row-copy">Notation guide</span>
        <ChevronRight aria-hidden="true" className="qar-about-notation-row-chevron" size={16} strokeWidth={1.7} />
      </ChoiceButton>
      {open ? (
        isDesktop ? (
          <Dialog
            onOpenChange={(next) => {
              if (!next) setOpen(false)
            }}
            open
            title="Notation guide"
          >
            {guide}
          </Dialog>
        ) : (
          <Sheet
            closeLabel="Close notation guide"
            onOpenChange={(next) => {
              if (!next) setOpen(false)
            }}
            open
            title="Notation guide"
          >
            {guide}
          </Sheet>
        )
      ) : null}
    </>
  )
}
