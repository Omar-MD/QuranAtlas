import { MushafModeControl } from './MushafModeControl'

function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+="[^"]*"/gi, '')
    .replace(/\shref="(?!\/dataset\/mushaf-pages\/)[^"]*"/gi, '')
}

export function MushafPageViewer({ page, svg }: { page: number; svg?: string }) {
  const sanitized = sanitizeSvg(svg ?? '<svg viewBox="0 0 120 180" role="img" aria-label="Mushaf page placeholder"><rect width="120" height="180" rx="2" fill="currentColor" opacity=".08"/></svg>')
  return (
    <section className="qar:grid qar:gap-4 qar:px-5 qar:py-5" aria-label={`Mushaf page ${page}`}>
      <div className="qar:flex qar:items-center qar:justify-between qar:gap-3">
        <p className="qar:m-0 qar:text-sm qar:text-muted">Page {page}</p>
        <MushafModeControl />
      </div>
      <div
        className="qar:mx-auto qar:w-full qar:max-w-3xl qar:text-text"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </section>
  )
}
