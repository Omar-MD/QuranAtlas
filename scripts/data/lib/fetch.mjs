// Shared fetch wrapper for the source-fetch lanes (audit §5: six hand-rolled
// fetch copies). One User-Agent and one non-2xx failure contract; the binary
// release-artifact download in mushaf-pages/fetch-release.mjs deliberately
// stays local (no UA, byte-count check, different error text).
export const FETCH_USER_AGENT = 'QuranAtlas-fetch/1.0 (https://quranatlas.org)'

async function fetchOk(url, accept) {
  const response = await fetch(url, { headers: { 'User-Agent': FETCH_USER_AGENT, Accept: accept } })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response
}

export async function fetchJson(url) {
  return (await fetchOk(url, 'application/json')).json()
}

export async function fetchText(url, accept = 'text/plain') {
  return (await fetchOk(url, accept)).text()
}
