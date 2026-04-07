# Test Quality Issues

**Date:** 2026-04-06
**Identified by:** Code review after audit v2 P0+P1 fixes

---

## Critical — Tests That Pass Despite Broken Behavior

### 1. "handles deep link to specific verse" — `reader.test.js:174`

```js
it('handles deep link to specific verse', async () => {
  await init({ surah: '1', ayah: '2' })
  const verses = document.querySelectorAll('[data-verse]')
  expect(verses.length).toBeGreaterThan(0)
})
```

**Problem:** The `ayah` param has two observable effects — resume indicator is suppressed and `scrollToVerse` is called with the target verse. Neither is asserted. The test passes even if `ayah` handling is completely removed.

**Fix:**
```js
// Resume indicator must be absent when ayah is provided
expect(document.querySelector('[data-resume-indicator]')).toBeFalsy()
// Verse count still works
expect(verses.length).toBeGreaterThan(0)
```

---

### 2. "navigates surah list with arrow keys" — `nav.test.js:235`

```js
it('navigates surah list with arrow keys', async () => {
  const items = document.querySelectorAll('.qa-nav-item')
  items[0].focus()
  items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  // jsdom doesn't actually move focus, but we verify the handler doesn't throw
  expect(items.length).toBe(4)
})
```

**Problem:** Asserts item count, which is set up before the event fires and is completely independent of it. The ArrowDown handler could be deleted and this test still passes. Nav items have `tabindex="0"` so `document.activeElement` IS observable in jsdom.

**Fix:**
```js
expect(document.activeElement).toBe(items[1])
```

---

## Important — Tests Weaker Than They Should Be

### 3. "cleanup removes scroll listener on re-init" — `reader.test.js:182`

```js
it('cleanup removes scroll listener on re-init', async () => {
  await init({ surah: '1' })
  await init({ surah: '1' })
  const verses = document.querySelectorAll('[data-verse]')
  expect(verses.length).toBe(2)
})
```

**Problem:** Test name claims cleanup verification but only asserts verse count. The `unobserve` mock is imported in the file but never interrogated. Passes even if `cleanup()` never runs.

**Fix:** Add `expect(scrollTracker.unobserve).toHaveBeenCalled()` — the mock is already set up at line 22-26.

---

### 4. "renders surah header with name and number" — `reader.test.js:102`

```js
expect(header.textContent).toContain('1')
```

**Problem:** `'1'` is too vague — it also matches verse counts in the same header text. Passes even if the surah number is in the wrong position.

**Fix:**
```js
expect(header.querySelector('.qa-surah-meta').textContent).toContain('Surah 1')
```

---

### 5. Bitmask assertion — `reader-story2.test.js:85`

```js
expect(endMarker.compareDocumentPosition(lastVerse) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
```

**Problem:** `toBeTruthy()` on a numeric bitmask obscures intent. `DOCUMENT_POSITION_PRECEDING = 2`, so the result is `0` or `2`. Should be exact.

**Fix:**
```js
expect(endMarker.compareDocumentPosition(lastVerse) & Node.DOCUMENT_POSITION_PRECEDING)
  .toBe(Node.DOCUMENT_POSITION_PRECEDING)
```

---

### 6. No-payload contract not locked down — `router.test.js:24`

```js
expect(restoreFn).toHaveBeenCalled()
```

**Problem:** `toHaveBeenCalled()` passes even if the event was emitted with an unexpected payload. The `router:launch-restore` event has no payload by design.

**Fix:**
```js
expect(restoreFn).toHaveBeenCalledWith(undefined)
```

---

### 7. No-payload contract not locked down — `offline.test.js:98`

```js
expect(completeFn).toHaveBeenCalled()
```

**Problem:** Same issue — `offline:download-complete` has no payload by design, but this is unasserted.

**Fix:**
```js
expect(completeFn).toHaveBeenCalledWith(undefined)
```

---

## Cleared (Not Issues)

### "observeNewVerses is a no-op when no observer exists" — `scroll-tracker.test.js:164`

Flagged for review but confirmed acceptable. Production code is `if (!observer) { return }` — genuinely no observable side effects. The `not.toThrow()` assertion is the correct and only valid assertion for this path.
