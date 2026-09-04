export type PackStatus = 'not-installed' | 'installing' | 'installed' | 'active' | 'failed' | 'unavailable'

export type PackLifecycleState = {
  packId: string
  status: PackStatus
  version?: string
  error?: string
  cachedAt?: number
  activatedAt?: number
}
