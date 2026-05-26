import { Button, Sheet } from '../ui'

export function TafsirSheet({ reference, text }: { reference: string; text: string }) {
  return (
    <Sheet title={`Tafsir ${reference}`} trigger={<Button size="sm" variant="secondary">Open tafsir</Button>}>
      <p className="qar:m-0 qar:text-sm qar:text-text">{text}</p>
    </Sheet>
  )
}
