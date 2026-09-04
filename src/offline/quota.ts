export type QuotaStatus = 'unknown' | 'comfortable' | 'constrained' | 'critical'

export type QuotaEstimate = {
  quota?: number
  usage?: number
}

export function mapQuotaEstimate(estimate: QuotaEstimate): { status: QuotaStatus; ratio?: number } {
  if (!estimate.quota || estimate.quota <= 0 || estimate.usage == null) return { status: 'unknown' }
  const ratio = estimate.usage / estimate.quota
  if (ratio >= 0.9) return { status: 'critical', ratio }
  if (ratio >= 0.75) return { status: 'constrained', ratio }
  return { status: 'comfortable', ratio }
}

export async function estimateStorageQuota(): Promise<{ status: QuotaStatus; ratio?: number }> {
  return mapQuotaEstimate(await navigator.storage?.estimate?.() ?? {})
}
