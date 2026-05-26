import type { MushafInstallPlan } from '../packs/mushaf-install-plan'

export type ReactMushafInstallRequest = MushafInstallPlan & {
  type: 'QA_REACT_MUSHAF_PACK_INSTALL'
}

export function createMushafInstallRequest(plan: MushafInstallPlan): ReactMushafInstallRequest {
  return { type: 'QA_REACT_MUSHAF_PACK_INSTALL', ...plan }
}
