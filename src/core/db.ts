// Barrel re-exporter for the split core/db/* sub-modules. Original
// monolithic db.ts (~370 LOC, 32+ importers, conflated connection +
// validation + types) was split 2026-04-29 per audit R-07 / C-2 / CC-2.
//
// New layout:
//   core/db/types.ts        — pure record + shared runtime types
//   core/db/migrations.js   — DB_NAME, DB_VERSION, applySchema (closure-free)
//   core/db/validate.ts     — _shapes table + validateWrite
//   core/db/connection.ts   — open/close, get/put/del, version handlers
//
// New code SHOULD import from the specific sub-module so the dependency
// graph stays explicit. This barrel exists so the 52 existing call
// sites don't churn in the same commit; subsequent commits (settings
// split, sync envelope, init-graph, etc.) update consumers as they
// land in those areas.

export type {
  Riwayah,
  BookmarkRecord,
  ActivationStatus,
  ActivationStateRecord,
  StoreRecords,
  StoreName,
} from './db/types'

export { DB_NAME, DB_VERSION, applySchema } from './db/migrations.js'

export { validateWrite } from './db/validate'

export {
  openDB,
  getDb,
  deleteDB,
  get,
  put,
  del,
} from './db/connection'
