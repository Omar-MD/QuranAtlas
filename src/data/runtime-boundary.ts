export function assertRuntimeDatasetUrl(url: string): void {
  const parsed = new URL(url, 'https://quranatlas.local')
  if (parsed.origin !== 'https://quranatlas.local') {
    throw new Error(`React dataset URLs must be same-origin: ${url}`)
  }
  if (!parsed.pathname.startsWith('/dataset/')) {
    throw new Error(`React runtime URLs must stay under /dataset/: ${url}`)
  }
}
