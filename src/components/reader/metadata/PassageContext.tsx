export function PassageContext({ summary }: { summary: string | null }) {
  return summary ? <p className="qar:m-0 qar:text-sm qar:text-muted">{summary}</p> : null
}
