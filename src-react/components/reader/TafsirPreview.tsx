export function TafsirPreview({ reference, text }: { reference: string; text: string }) {
  return (
    <section className="qar:mt-3 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-3" aria-label={`Tafsir ${reference}`}>
      <p className="qar:m-0 qar:text-xs qar:uppercase qar:text-muted">tafsir · {reference}</p>
      <p className="qar:m-0 qar:mt-2 qar:text-sm qar:text-text">{text}</p>
    </section>
  )
}
