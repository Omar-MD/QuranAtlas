export class ReviewState {
  view = $state('all')
  groupBy = $state('tag')
  sort = $state('recent')
  activeTag = $state<string | null>(null)
  activeTags = $state<string[]>([])
  surahFilter = $state<number | null>(null)
  activeLayer = $state('threads')
  activeValue = $state<string | null>(null)
}
export const review = new ReviewState()
