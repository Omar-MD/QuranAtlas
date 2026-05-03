# User Stories

## Reader Stories

### As a daily reader
I want to open the app and read Qur'an without distraction, so that I can use it as my primary Qur'an app.

Acceptance criteria:

- Arabic text loads quickly.
- Translation is optional.
- Reflection features do not clutter the default reader.
- Missing knowledge/reflection data never breaks reading.

### As a reader using another riwayah
I want the reader to respect my selected riwayah, so that the app remains trustworthy for my recitation.

Acceptance criteria:

- Selected riwayah renders correctly.
- Translation alignment continues to work.
- Knowledge data does not break riwayah display.

## Context Stories

### As a beginner
I want to know what passage I am reading, so that I am not reflecting on isolated verses without context.

Acceptance criteria:

- The app can show a short passage title.
- The app can show a short passage summary.
- The context is optional and visually lightweight.

### As a reflective reader
I want to see the main themes of an ayah, so that I know what to pay attention to.

Acceptance criteria:

- Ayah theme chips are available from the ayah interaction surface.
- Themes are controlled by a taxonomy.
- Themes are not random generated labels.

### As a learner
I want to find other ayat with the same theme, so that I can deepen my understanding across the Qur'an.

Acceptance criteria:

- Theme-to-ayah index exists.
- Related ayat can be generated from structured data.
- Results are sorted by relevance and Qur'anic order.

## Reflection Stories

### As a user who does not know how to do tadabbur
I want the app to ask me a simple reflection question, so that I can begin without feeling lost.

Acceptance criteria:

- A prompt can be shown for the ayah.
- Only one prompt is shown by default.
- The prompt is suitable for my level.

### As a user who gets overwhelmed by tafsir
I want the app to reveal depth gradually, so that I can reflect before reading long explanations.

Acceptance criteria:

- Reflection prompt appears before deep tafsir by default.
- Tafsir remains available.
- The user can expand only when ready.

### As a user trying to act on the Qur'an
I want to leave a reflection session with one concrete action, so that my reading changes my life.

Acceptance criteria:

- Future reflection lane supports action prompts.
- Actions are small and realistic.
- Legal/religious rulings are not invented.

## Trust Stories

### As a cautious user
I want to know whether something is tafsir, reflection, or AI, so that I do not confuse personal insight with religious explanation.

Acceptance criteria:

- Data items have type/source metadata.
- AI outputs are grounded in retrievable sources.
- Reflection prompts are labeled separately from tafsir.

### As a product owner
I want validation to reject bad source data, so that incorrect themes or invalid ayah references do not ship.

Acceptance criteria:

- Invalid ayah keys fail build.
- Unknown theme ids fail build.
- Overlapping passages fail in Phase 01.
- Unapproved data is excluded from baseline.

## Offline Stories

### As an offline user
I want reader features to work without internet, so that I can continue using the app reliably.

Acceptance criteria:

- Text lane works offline.
- Knowledge lane can be cached separately.
- Reflection lane can later be cached separately.
- Missing optional lanes do not break reader behavior.

## Future AI Stories

### As a user asking for explanation
I want AI assistance grounded in tafsir and structured knowledge, so that I can trust the answer.

Acceptance criteria:

- AI retrieves from source-backed chunks.
- AI cites or references its grounding.
- AI distinguishes tafsir from reflection.
- AI avoids unsupported legal or creedal conclusions.

### As a user reflecting on my life
I want AI to help me think more deeply without pretending to know the unseen or issuing religious rulings.

Acceptance criteria:

- AI asks reflective questions.
- AI does not over-personalize the ayah.
- AI stays within tafsir-backed boundaries.
