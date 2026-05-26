import { Button } from '../ui'

export const REACT_SURAH_ROWS = [
  { n: 1, name: 'Al-Fatihah', verses: 7 },
  { n: 2, name: 'Al-Baqarah', verses: 286 },
  { n: 67, name: 'Al-Mulk', verses: 30 },
]

export function SurahList({ onNavigate }: { onNavigate?: (hash: string) => void }) {
  return (
    <div className="qar:grid qar:gap-2" aria-label="Surah list">
      {REACT_SURAH_ROWS.map((surah) => (
        <div className="qar:flex qar:items-center qar:justify-between qar:gap-3 qar:border-b qar:border-border qar:py-2" key={surah.n}>
          <div>
            <p className="qar:m-0 qar:text-sm qar:text-text">{surah.n}. {surah.name}</p>
            <p className="qar:m-0 qar:text-xs qar:text-muted">{surah.verses} verses</p>
          </div>
          <Button onClick={() => onNavigate?.(`#/s/${surah.n}`)} size="sm" variant="secondary">Open</Button>
        </div>
      ))}
    </div>
  )
}
