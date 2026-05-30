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
