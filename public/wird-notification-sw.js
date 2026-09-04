self.addEventListener('periodicsync', (event) => {
  if (event.tag !== 'quranatlas-daily-wird-reminder') return
  event.waitUntil(showStoredWirdReminder())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const targetUrl = typeof data.url === 'string' ? data.url : '/#/s/1'

  event.waitUntil((async () => {
    const target = new URL(targetUrl, self.location.origin)
    const windows = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })

    for (const client of windows) {
      const clientUrl = new URL(client.url)
      if (clientUrl.origin !== target.origin) continue
      if ('navigate' in client) await client.navigate(target.href)
      await client.focus()
      return
    }

    await self.clients.openWindow(target.href)
  })())
})

async function showStoredWirdReminder() {
  const plan = normalizeWirdPlan(await readSettingValue('wirdPlan'))
  if (!plan || !plan.reminder.enabled) return
  if (self.Notification && self.Notification.permission !== 'granted' && plan.reminder.browserNotifications !== 'granted') return
  if (!isReminderTimeDue(plan.reminder.time)) return

  const dayKey = getLocalDayKey()
  if (await readSettingValue('wirdReminderLastSentDay') === dayKey) return

  const current = plan.progress.dayKey === dayKey ? plan : await recomputeStoredWirdPlan(plan, dayKey)
  if (!current || !shouldSendStoredWirdReminder(current)) return

  const ref = current.progress.nextRef
  const hash = `#/s/${ref.surah}/${ref.verse}?wird=1`
  await self.registration.showNotification('Daily Wird', {
    body: `Tap to continue at ${ref.surah}:${ref.verse}.`,
    data: { hash, url: `${self.location.origin}/${hash}` },
    renotify: true,
    silent: false,
    tag: 'quranatlas-daily-wird-reminder',
    timestamp: Date.now(),
    vibrate: [120, 80, 120],
  })
  await writeSettingValue('wirdReminderLastSentDay', dayKey)
  if (current !== plan) await writeSettingValue('wirdPlan', current)
}

async function recomputeStoredWirdPlan(plan, dayKey) {
  const counts = await loadWirdCounts()
  if (!counts.length) return null
  const assignment = computeAssignment(plan, counts, dayKey)
  return {
    ...plan,
    history: [
      ...plan.history.filter((entry) => entry.dayKey !== plan.progress.dayKey),
      {
        assignedEndRef: plan.progress.todayEndRef,
        assignedStartRef: plan.progress.todayStartRef,
        completedThroughRef: plan.progress.completedThroughRef,
        dayKey: plan.progress.dayKey,
      },
    ],
    progress: {
      ...plan.progress,
      dayKey,
      nextRef: assignment.nextRef,
      todayEndRef: assignment.todayEnd,
      todayStartRef: assignment.todayStart,
    },
  }
}

function shouldSendStoredWirdReminder(plan) {
  if (compareRefs(plan.progress.completedThroughRef, plan.endRef) >= 0) return false
  if (compareRefs(plan.progress.completedThroughRef, plan.progress.todayEndRef) >= 0) return false
  return true
}

async function loadWirdCounts() {
  try {
    const response = await fetch('/dataset/surahs.json')
    if (!response.ok) return []
    const rows = await response.json()
    if (!Array.isArray(rows)) return []
    return rows
      .map((row) => ({ count: row && row.counts ? Number(row.counts.qaloon) : 0, n: Number(row && row.n) }))
      .filter((row) => Number.isInteger(row.n) && row.n >= 1 && Number.isInteger(row.count) && row.count >= 1)
  } catch {
    return []
  }
}

function computeAssignment(plan, counts, dayKey) {
  const planStart = refToIndex(plan.startRef, counts)
  const planEnd = refToIndex(plan.endRef, counts)
  const completed = plan.progress.completedThroughRef
    ? refToIndex(plan.progress.completedThroughRef, counts)
    : planStart - 1
  const next = clampIndex(completed + 1, planStart, planEnd)
  const remaining = Math.max(1, planEnd - next + 1)
  const days = inclusiveDays(dayKey, plan.targetEndOn)
  const portion = Math.max(1, Math.ceil(remaining / days))
  const todayStart = refFromIndex(next, counts)
  const todayEnd = refFromIndex(clampIndex(next + portion - 1, planStart, planEnd), counts)
  return { nextRef: todayStart, todayEnd, todayStart }
}

function refToIndex(ref, counts) {
  let total = 0
  for (const row of counts) {
    if (row.n === ref.surah) return total + ref.verse
    total += row.count
  }
  return total + ref.verse
}

function refFromIndex(index, counts) {
  let remaining = Math.max(1, Math.floor(index))
  for (const row of counts) {
    if (remaining <= row.count) return { surah: row.n, verse: remaining }
    remaining -= row.count
  }
  const last = counts[counts.length - 1] || { n: 1, count: 1 }
  return { surah: last.n, verse: last.count }
}

function clampIndex(index, min, max) {
  return Math.min(max, Math.max(min, Math.floor(index)))
}

function inclusiveDays(fromDay, toDay) {
  const from = new Date(`${fromDay}T00:00:00`)
  const to = new Date(`${toDay}T00:00:00`)
  const days = Math.floor((to.getTime() - from.getTime()) / 86400000) + 1
  return Math.max(1, days)
}

function compareRefs(a, b) {
  if (!a && !b) return 0
  if (!a) return -1
  if (!b) return 1
  if (a.surah !== b.surah) return a.surah - b.surah
  return a.verse - b.verse
}

function normalizeWirdPlan(value) {
  if (!value || typeof value !== 'object') return null
  if (!isQuranRef(value.startRef) || !isQuranRef(value.endRef) || !value.progress || typeof value.progress !== 'object') return null
  const reminder = value.reminder && typeof value.reminder === 'object' ? value.reminder : {}
  const progress = value.progress
  const dayKey = getLocalDayKey()
  return {
    ...value,
    history: Array.isArray(value.history) ? value.history : [],
    progress: {
      ...progress,
      completedThroughRef: isQuranRef(progress.completedThroughRef) ? progress.completedThroughRef : null,
      dayKey: typeof progress.dayKey === 'string' && progress.dayKey ? progress.dayKey : dayKey,
      lastReadRef: isQuranRef(progress.lastReadRef) ? progress.lastReadRef : value.startRef,
      nextRef: isQuranRef(progress.nextRef) ? progress.nextRef : value.startRef,
      todayEndRef: isQuranRef(progress.todayEndRef) ? progress.todayEndRef : value.startRef,
      todayStartRef: isQuranRef(progress.todayStartRef) ? progress.todayStartRef : value.startRef,
    },
    reminder: {
      browserNotifications: reminder.browserNotifications === 'granted' ? 'granted' : 'default',
      enabled: reminder.enabled === true,
      time: typeof reminder.time === 'string' && reminder.time ? reminder.time : '07:00',
    },
    targetEndOn: typeof value.targetEndOn === 'string' && value.targetEndOn ? value.targetEndOn : dayKey,
  }
}

function isQuranRef(value) {
  return Boolean(value)
    && typeof value === 'object'
    && Number.isInteger(value.surah)
    && value.surah >= 1
    && Number.isInteger(value.verse)
    && value.verse >= 1
}

function isReminderTimeDue(time) {
  const now = new Date()
  const parts = String(time || '07:00').match(/^(\d{1,2}):(\d{2})$/)
  const hours = parts ? Number(parts[1]) : 7
  const minutes = parts ? Number(parts[2]) : 0
  const due = new Date(now)
  due.setHours(
    Number.isInteger(hours) && hours >= 0 && hours <= 23 ? hours : 7,
    Number.isInteger(minutes) && minutes >= 0 && minutes <= 59 ? minutes : 0,
    0,
    0,
  )
  return now.getTime() >= due.getTime()
}

function getLocalDayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function readSettingValue(key) {
  const record = await withSettingsStore('readonly', (store) => requestAsPromise(store.get(key)))
  return record ? record.value : undefined
}

async function writeSettingValue(key, value) {
  await withSettingsStore('readwrite', (store) => requestAsPromise(store.put({ key, value })))
}

async function withSettingsStore(mode, callback) {
  const db = await openQuranAtlasDb()
  if (!db || !db.objectStoreNames.contains('settings')) {
    db?.close()
    return undefined
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('settings', mode)
    const store = transaction.objectStore('settings')
    let result
    transaction.oncomplete = () => {
      db.close()
      resolve(result)
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error || new Error('Settings transaction failed'))
    }
    Promise.resolve(callback(store)).then((value) => {
      result = value
    }).catch((error) => {
      transaction.abort()
      reject(error)
    })
  })
}

function openQuranAtlasDb() {
  if (!self.indexedDB) return Promise.resolve(null)
  return requestAsPromise(self.indexedDB.open('quran-atlas'))
}

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'))
  })
}
