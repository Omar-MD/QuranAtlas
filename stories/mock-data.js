/**
 * Mock data for Storybook stories.
 * Mirrors the actual dataset structure so stories render realistic content.
 */

export const SURAHS = [
  { n: 1, name: 'Al-Fatiha', arabic: 'الفاتحة', type: 'Meccan', count: 7, juz: 1 },
  { n: 2, name: 'Al-Baqarah', arabic: 'البقرة', type: 'Medinan', count: 286, juz: 1 },
  { n: 3, name: "Aal-E-Imran", arabic: 'آل عمران', type: 'Medinan', count: 200, juz: 3 },
  { n: 18, name: 'Al-Kahf', arabic: 'الكهف', type: 'Meccan', count: 110, juz: 15 },
  { n: 19, name: 'Maryam', arabic: 'مريم', type: 'Meccan', count: 98, juz: 16 },
  { n: 36, name: 'Ya-Sin', arabic: 'يس', type: 'Meccan', count: 83, juz: 22 },
  { n: 55, name: 'Ar-Rahman', arabic: 'الرحمن', type: 'Medinan', count: 78, juz: 27 },
  { n: 67, name: 'Al-Mulk', arabic: 'الملك', type: 'Meccan', count: 30, juz: 29 },
  { n: 112, name: 'Al-Ikhlas', arabic: 'الإخلاص', type: 'Meccan', count: 4, juz: 30 },
  { n: 113, name: 'Al-Falaq', arabic: 'الفلق', type: 'Meccan', count: 5, juz: 30 },
  { n: 114, name: 'An-Nas', arabic: 'الناس', type: 'Meccan', count: 6, juz: 30 },
]

export const SURAHS_CONTENT = {
  1: {
    ar: [
      'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
      'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ',
      'ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
      'مَـٰلِكِ يَوْمِ ٱلدِّينِ',
      'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
      'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
      'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
    ],
    en: [
      'In the name of God, the Gracious, the Merciful',
      'All praise is due to God, Lord of all worlds',
      'The Gracious, the Merciful',
      'Master of the Day of Judgment',
      'You alone we worship, and You alone we ask for help',
      'Guide us along the Straight Path',
      'The path of those You have blessed, not of those who earned Your anger, nor of those who went astray',
    ],
  },
  2: {
    ar: [
      'الٓمٓ',
      'ذَٰلِكَ ٱلْكِتَـٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ',
      'ٱلَّذِينَ يُؤْمِنُونَ بِٱلْغَيْبِ وَيُقِيمُونَ ٱلصَّلَوٰةَ وَمِمَّا رَزَقْنَـٰهُمْ يُنفِقُونَ',
      'وَٱلَّذِينَ يُؤْمِنُونَ بِمَآ أُنزِلَ إِلَيْكَ وَمَآ أُنزِلَ مِن قَبْلِكَ وَبِٱلْـَٔاخِرَةِ هُمْ يُوقِنُونَ',
      'أُو۟لَـٰٓئِكَ عَلَىٰ هُدًى مِّن رَّبِّهِمْ ۖ وَأُو۟لَـٰٓئِكَ هُمُ ٱلْمُفْلِحُونَ',
    ],
    en: [
      'Alif, Lam, Meem',
      'This is the Book about which there is no doubt, a guidance for those conscious of God',
      'Who believe in the unseen, establish prayer, and spend out of what We have provided for them',
      'And who believe in what has been revealed to you and what was revealed before you, and of the Hereafter they are certain',
      'Those are upon guidance from their Lord, and it is those who are the successful',
    ],
  },
  36: {
    ar: [
      'يسٓ',
      'وَٱلْقُرْءَانِ ٱلْحَكِيمِ',
      'إِنَّكَ لَمِنَ ٱلْمُرْسَلِينَ',
    ],
    en: [
      'Ya, Sin',
      'By the wise Quran',
      'Indeed you are from among the messengers',
    ],
  },
  55: {
    ar: [
      'ٱلرَّحْمَـٰنُ',
      'عَلَّمَ ٱلْقُرْءَانَ',
      'خَلَقَ ٱلْإِنسَـٰنَ',
    ],
    en: [
      'The Most Merciful',
      'Taught the Quran',
      'Created man',
    ],
  },
  67: {
    ar: [
      'تَبَـٰرَكَ ٱلَّذِى بِيَدِهِ ٱلْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَىْءٍ قَدِيرٌ',
    ],
    en: [
      'Blessed is He in whose hand is dominion, and He is over all things competent',
    ],
  },
  112: {
    ar: [
      'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
      'ٱللَّهُ ٱلصَّمَدُ',
      'لَمْ يَلِدْ وَلَمْ يُولَدْ',
      'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ',
    ],
    en: [
      'Say, "He is God, the One"',
      'God, the Eternal Refuge',
      'He neither begets nor is born',
      'Nor is there to Him any equivalent',
    ],
  },
  113: {
    ar: [
      'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ',
      'مِن شَرِّ مَا خَلَقَ',
      'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ',
      'وَمِن شَرِّ ٱلنَّفَّـٰثَـٰتِ فِى ٱلْعُقَدِ',
      'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
    ],
    en: [
      'Say, "I seek refuge in the Lord of daybreak"',
      'From the evil of that which He created',
      'And from the evil of darkness when it settles',
      'And from the evil of the blowers in knots',
      'And from the evil of an envier when he envies',
    ],
  },
  114: {
    ar: [
      'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ',
      'مَلِكِ ٱلنَّاسِ',
      'إِلَـٰهِ ٱلنَّاسِ',
      'مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ',
      'ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ',
      'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ',
    ],
    en: [
      'Say, "I seek refuge in the Lord of mankind"',
      'The Sovereign of mankind',
      'The God of mankind',
      'From the evil of the retreating whisperer',
      'Who whispers in the breasts of mankind',
      'From among jinn and mankind',
    ],
  },
}

export const MOCK_MARKS = {
  '1:1': { verseKey: '1:1', tags: ['favourite'], updatedAt: Date.now() },
  '1:5': { verseKey: '1:5', tags: ['study'], updatedAt: Date.now() },
  '2:255': { verseKey: '2:255', tags: ['reflection', 'favourite'], updatedAt: Date.now() },
  '36:1': { verseKey: '36:1', tags: ['study'], updatedAt: Date.now() },
}

export const MOCK_POSITIONS = {
  's2': { id: 's2', surah: 2, verse: 25, savedAt: Date.now() },
  's36': { id: 's36', surah: 36, verse: 1, savedAt: Date.now() },
}

/**
 * Inject mock data into IndexedDB for story args.
 * @param {object} args - Story args (hasPosition, hideTranslation, etc.)
 */
export async function setupMockData(args) {
  const { openDB, put } = await import('../src/core/db.js')
  await openDB()

  if (args.hasPosition) {
    await put('positions', MOCK_POSITIONS['s2'])
  }
  if (args.hideTranslation) {
    await put('settings', { key: 'translationVisible', value: false })
  }
}

/**
 * Mock fetch to return surah content instead of hitting the network.
 * @param {number} surahNum - Surah number to mock
 */
export function setupMockFetch(surahNum) {
  const surah = SURAHS_CONTENT[surahNum]
  if (!surah) return

  const originalFetch = globalThis.fetch

  globalThis.fetch = async (url, ...rest) => {
    if (typeof url === 'string' && url.includes('/dataset/surah/')) {
      return { ok: true, status: 200, json: async () => surah }
    }
    if (typeof url === 'string' && url.includes('/dataset/surahs.json')) {
      return { ok: true, status: 200, json: async () => SURAHS }
    }
    return originalFetch(url, ...rest)
  }
}
