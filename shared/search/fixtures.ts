export const SEARCH_FIXTURE_IDS = {
  abiDecode: 'search-fixture-abi-decode-v1',
  malformedAbi: 'search-fixture-malformed-abi-v1',
  malformedTable: 'search-fixture-malformed-table-v1',
  diacritizedArabic: 'search-fixture-diacritized-arabic-v1',
  undiacritizedArabic: 'search-fixture-undiacritized-arabic-v1',
  hamzaAlifVariants: 'search-fixture-hamza-alif-variants-v1',
  quranMarks: 'search-fixture-quran-marks-v1',
  mixedArabicEnglish: 'search-fixture-mixed-arabic-english-v1',
  references: 'search-fixture-references-v1',
  exactWordPreservation: 'search-fixture-exact-word-preservation-v1',
  phraseBoundary: 'search-fixture-phrase-boundary-v1',
  maxPhraseLength: 'search-fixture-max-phrase-length-v1',
  ayahBoundary: 'search-fixture-ayah-boundary-v1',
  surahBoundary: 'search-fixture-surah-boundary-v1',
  bismillahBoundary: 'search-fixture-bismillah-boundary-v1',
  mapping: 'search-fixture-mapping-v1',
  byteBudget: 'search-fixture-byte-budget-v1',
  workerProtocol: 'search-fixture-worker-protocol-v1',
} as const

export type SearchFixtureId = typeof SEARCH_FIXTURE_IDS[keyof typeof SEARCH_FIXTURE_IDS]

export const SEARCH_TEXT_FIXTURES = {
  diacritizedArabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
  undiacritizedArabic: 'قل هو الله احد',
  hamzaAlifVariants: 'أإآٱا',
  quranMarks: 'قُلْۚ هُوَ ٱللَّهُ',
  mixedArabicEnglish: 'Surah 112: قل هو الله احد',
  exactWordPreservation: 'أَحَدٌ',
  phraseBoundary: 'قل هو الله احد',
  maxPhraseLength: 'one two three four five six seven eight nine',
} as const
