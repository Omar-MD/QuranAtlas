import type { SearchWorkerRequest } from '../../shared/search'
import { SearchWorkerSession } from './session'

const session = new SearchWorkerSession()

self.addEventListener('message', (event: MessageEvent<SearchWorkerRequest>) => {
  void session.handle(event.data).then((response) => {
    self.postMessage(response)
  })
})
