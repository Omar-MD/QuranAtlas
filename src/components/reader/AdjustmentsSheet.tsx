import { useEffect } from 'react'

import { Sheet, SheetBody } from '../ui'
import { VerseReadingControls } from '../settings/VerseReadingControls'
import { useSettingsForm } from '../settings/useSettingsForm'

// S3 adjustments sheet: Arabic size, translation size, and the verse spacing
// preset in a bottom sheet with one scroll owner; the page behind is locked
// (modal), focus is trapped and returned to the invoking control. The same
// controls and labels as the S8 Reading section.
export function AdjustmentsSheet({ onClose, open }: { onClose: () => void; open: boolean }) {
  const { setFontSize, setTranslationFontSize, setVerseSpacing, state } = useSettingsForm()
  const preferences = state.preferences

  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null
  return (
    <Sheet
      closeLabel="Close text size"
      contentClassName="qar-react-adjustments-sheet"
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      open
      returnFocusId="reader-adjustments-trigger"
      title="Text size"
    >
      <SheetBody>
        <div className="qar-react-settings-body">
          <VerseReadingControls
            fontSize={preferences.fontSize}
            onFontSizeChange={setFontSize}
            onTranslationFontSizeChange={setTranslationFontSize}
            onVerseSpacingChange={setVerseSpacing}
            translationFontSize={preferences.translationFontSize}
            verseSpacing={preferences.verseSpacing}
          />
        </div>
      </SheetBody>
    </Sheet>
  )
}
