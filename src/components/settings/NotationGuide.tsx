import { useState } from 'react'

import { Button, Dialog, Sheet } from '../ui'

export function NotationGuideButton() {
  const [open, setOpen] = useState(false)
  const guide = (
    <div className="qar:grid qar:gap-3">
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
      <Button
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        size="sm"
        variant="secondary"
        data-testid="notation-guide-button"
      >
        Notation guide
      </Button>
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
