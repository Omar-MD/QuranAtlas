export function MetadataUnavailable({ label = 'Metadata unavailable' }: { label?: string }) {
  return <p className="qar:m-0 qar:text-sm qar:text-muted">{label}</p>
}
