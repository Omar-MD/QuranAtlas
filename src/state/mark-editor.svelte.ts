export class MarkEditorState {
  isOpen = $state(false)
  currentVerseKey = $state<string | null>(null)
  selectedTags = $state<string[]>([])
  draftNote = $state('')
}
export const markEditor = new MarkEditorState()
