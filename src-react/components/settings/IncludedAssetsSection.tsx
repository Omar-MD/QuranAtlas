import { BookOpen, ChevronRight, FileText } from 'lucide-react'

import { DEFAULT_READER_ASSET_PROFILE, readerAssetProfileRows } from '../../../shared/reader-assets/default-profile'

const rows = readerAssetProfileRows(DEFAULT_READER_ASSET_PROFILE)

export function IncludedAssetsSection() {
  return (
    <section className="qar-react-settings-assets" aria-labelledby="qar-react-settings-included-assets">
      <div className="qar-react-settings-section-heading">
        <span>
          <h3 className="qar-react-settings-section-title" id="qar-react-settings-included-assets">Included assets</h3>
          <p className="qar-react-settings-section-note">Read-only inventory for the active MVP profile.</p>
        </span>
      </div>
      <div className="qar-react-settings-asset-list">
        {rows.map((row) => (
          <div className="qar-react-settings-asset-row" key={row.id}>
            <span
              aria-hidden="true"
              className="qar-react-settings-asset-icon"
              data-asset-icon={assetIconName(row.group)}
              data-testid="settings-asset-icon"
            >
              <AssetIcon group={row.group} />
            </span>
            <span className="qar-react-settings-asset-main">
              <span className="qar-react-settings-row-label">{row.label}</span>
            </span>
            <span className="qar-react-settings-asset-status">Included</span>
            <ChevronRight aria-hidden="true" className="qar-react-settings-asset-chevron" size={16} strokeWidth={1.65} />
          </div>
        ))}
      </div>
    </section>
  )
}

function AssetIcon({ group }: { group: (typeof rows)[number]['group'] }) {
  if (group === 'mushaf') return <BookOpen size={17} strokeWidth={1.65} />
  if (group === 'translation') return <FileText size={17} strokeWidth={1.65} />
  return <TextFontIcon />
}

function assetIconName(group: (typeof rows)[number]['group']): string {
  if (group === 'mushaf') return 'mushaf-book'
  if (group === 'translation') return 'translation-document'
  return 'text-font'
}

function TextFontIcon() {
  return (
    <svg
      aria-hidden="true"
      className="qar-react-settings-text-font-icon"
      fill="none"
      height="19"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.55"
      viewBox="0 0 24 24"
      width="19"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4.75 5.25h10.5" />
      <path d="M10 5.25v13.5" />
      <path d="M6.75 18.75h6.5" />
      <path d="M15.5 10.25h4.25" />
      <path d="M17.65 10.25v8.5" />
      <path d="M15.85 18.75h3.6" />
      <path d="M4.75 21h14.5" />
    </svg>
  )
}
