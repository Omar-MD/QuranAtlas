/**
 * English meanings for surah names. Source: commonly used translations.
 * Used for display in the surah list cards and as a searchable field.
 */
export const SURAH_MEANINGS: Record<number, string> = {
  1: 'The Opener', 2: 'The Cow', 3: 'Family of Imran', 4: 'The Women',
  5: 'The Table Spread', 6: 'The Cattle', 7: 'The Heights', 8: 'The Spoils of War',
  9: 'The Repentance', 10: 'Jonah', 11: 'Hud', 12: 'Joseph',
  13: 'The Thunder', 14: 'Abraham', 15: 'The Rocky Tract', 16: 'The Bee',
  17: 'The Night Journey', 18: 'The Cave', 19: 'Mary', 20: 'Ta-Ha',
  21: 'The Prophets', 22: 'The Pilgrimage', 23: 'The Believers', 24: 'The Light',
  25: 'The Criterion', 26: 'The Poets', 27: 'The Ant', 28: 'The Stories',
  29: 'The Spider', 30: 'The Romans', 31: 'Luqman', 32: 'The Prostration',
  33: 'The Combined Forces', 34: 'Sheba', 35: 'The Originator', 36: 'Ya-Sin',
  37: 'Those Who Set the Ranks', 38: 'Sad', 39: 'The Groups', 40: 'The Forgiver',
  41: 'Explained in Detail', 42: 'The Consultation', 43: 'The Gold Adornments',
  44: 'The Smoke', 45: 'The Kneeling', 46: 'The Sand Dunes', 47: 'Muhammad',
  48: 'The Victory', 49: 'The Rooms', 50: 'Qaf', 51: 'The Winnowing Winds',
  52: 'The Mount', 53: 'The Star', 54: 'The Moon', 55: 'The Most Merciful',
  56: 'The Inevitable', 57: 'The Iron', 58: 'The Pleading Woman', 59: 'The Gathering',
  60: 'The Examined One', 61: 'The Ranks', 62: 'Friday', 63: 'The Hypocrites',
  64: 'Mutual Disillusion', 65: 'The Divorce', 66: 'The Prohibition', 67: 'The Sovereignty',
  68: 'The Pen', 69: 'The Reality', 70: 'The Ascending Stairways', 71: 'Noah',
  72: 'The Jinn', 73: 'The Enshrouded One', 74: 'The Cloaked One', 75: 'The Resurrection',
  76: 'Man', 77: 'Those Sent Forth', 78: 'The Great News', 79: 'Those Who Pull Out',
  80: 'He Frowned', 81: 'The Overthrowing', 82: 'The Cleaving', 83: 'The Defrauding',
  84: 'The Splitting Open', 85: 'The Constellations', 86: 'The Night Visitor',
  87: 'The Most High', 88: 'The Overwhelming', 89: 'The Dawn', 90: 'The City',
  91: 'The Sun', 92: 'The Night', 93: 'The Morning Hours', 94: 'The Relief',
  95: 'The Fig', 96: 'The Clot', 97: 'The Power', 98: 'The Clear Proof',
  99: 'The Earthquake', 100: 'The Chargers', 101: 'The Calamity', 102: 'Rivalry',
  103: 'The Declining Day', 104: 'The Traducer', 105: 'The Elephant', 106: 'Quraysh',
  107: 'Small Kindnesses', 108: 'The Abundance', 109: 'The Disbelievers',
  110: 'The Divine Support', 111: 'The Palm Fiber', 112: 'The Sincerity',
  113: 'The Daybreak', 114: 'Mankind',
}

export function getMeaning(n: number): string {
  return SURAH_MEANINGS[n] || ''
}
