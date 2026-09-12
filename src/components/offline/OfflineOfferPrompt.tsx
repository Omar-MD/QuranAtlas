import { Button, Dialog } from '../ui'
import { formatOfflinePackSize, type OfflineDownloadOffer } from '../../launch/offline-download-setup'

export function OfflineOfferPrompt({
  offer,
  onDownload,
  onLater,
}: {
  offer: OfflineDownloadOffer
  onDownload: () => void
  onLater: () => void
}) {
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onLater()
      }}
      open
      title="Download for offline reading"
    >
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        Your reader texts are saved to this device automatically. Add the complete Mushaf pages to keep reading without
        a connection.
      </p>
      <p className="qar:m-0 qar:text-sm qar:text-text">
        Complete Mushaf · {formatOfflinePackSize(offer.mushafPlan.totalBytes)}
      </p>
      <div className="qar:grid qar:gap-2">
        <Button onClick={onDownload} type="button">
          Download pages
        </Button>
        <Button onClick={onLater} type="button" variant="secondary">
          Not now
        </Button>
      </div>
    </Dialog>
  )
}
