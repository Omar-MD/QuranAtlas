import { Button } from '../ui'

export function JuzList({ onNavigate }: { onNavigate?: (hash: string) => void }) {
  return (
    <div className="qar:grid qar:gap-2" aria-label="Juz list">
      {[1, 2, 3].map((juz) => (
        <div className="qar:flex qar:items-center qar:justify-between qar:border-b qar:border-border qar:py-2" key={juz}>
          <span className="qar:text-sm">Juz {juz}</span>
          <Button onClick={() => onNavigate?.(`#/s/${juz === 1 ? 1 : 2}`)} size="sm" variant="ghost">Continue</Button>
        </div>
      ))}
    </div>
  )
}
