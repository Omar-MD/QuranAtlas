import { useEffect, useState } from 'react'

import { ListRow } from '../ui'

// Juz list shared by the reader's Surahs selector and the Surahs overlay, so
// both surfaces offer the same browse capability.
export function JuzPickerRows({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const [rows, setRows] = useState<Array<{ n: number; start: { surah: number; verse: number } }>>([])
  useEffect(() => {
    let active = true
    void import('../../data/juz-index')
      .then(({ loadJuzIndex }) => loadJuzIndex())
      .then((loaded) => {
        if (active) setRows(loaded)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])
  return (
    <ul aria-label="Juz list" className="qar-react-juz-list">
      {rows.map((row) => (
        <li key={row.n}>
          <ListRow
            meta={`Starts at ${row.start.surah}:${row.start.verse}`}
            num={row.n}
            onSelect={() => onNavigate(`#/s/${row.start.surah}/${row.start.verse}`)}
            title={`Juz ${row.n}`}
          />
        </li>
      ))}
    </ul>
  )
}
