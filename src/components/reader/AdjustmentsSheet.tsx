import { Sheet, SheetBody } from '../ui'
import { VerseReadingControls } from '../settings/VerseReadingControls'
import { useSettingsForm } from '../settings/useSettingsForm'

// S3 adjustments sheet (brief §4.15): the quick content-height sheet with the
// quiet scrim — the verses above it are the live preview. Radix owns Escape,
// scrim tap, focus trap and focus return to the Aa trigger.
export function AdjustmentsSheet({ onClose, open }: { onClose: () => void; open: boolean }) {
  const { setFontSize, setTranslationFontSize, setVerseSpacing, state } = useSettingsForm()
  const preferences = state.preferences

  if (!open) return null
  return (
    <Sheet
      closeLabel="Close text and spacing"
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      open
      returnFocusId="reader-adjustments-trigger"
      title="Text and spacing"
      variant="quick"
    >
      <SheetBody>
        <div className="qar-react-settings-body">
          <VerseReadingControls
            fontSize={preferences.fontSize}
            onFontSizeChange={setFontSize}
            onTranslationFontSizeChange={setTranslationFontSize}
            onVerseSpacingChange={setVerseSpacing}
            translationFontSize={preferences.translationFontSize}
            translationVisible={preferences.translationVisible}
            verseSpacing={preferences.verseSpacing}
          />
        </div>
      </SheetBody>
    </Sheet>
  )
}
