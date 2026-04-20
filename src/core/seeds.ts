import type { LayerName } from './db'

export const LAYER_SEEDS: Record<LayerName, string[]> = {
  threads: ['mercy','gratitude','patience','reflection','prayer','forgiveness','tawhid','tawakkul','hope','justice','dunya','akhirah','repentance','guidance','fear','knowledge','sabr','ikhlas','taqwa','ihsan'],
  subjects: ['paradise','hellfire','angels','wealth','family','marriage','community','nature','food','speech','sleep','dreams','death','resurrection','book'],
  audience: ['muminin','muslimin','muttaqin','muhsinin','mukhlisin','sabirin','shakirin','tawwabin','kafirin','munafiqin','mushrikin','zalimin','fasiqin',"ahl al-kitab",'yahud','nasara',"bani isra'il",'nas','rasul','nabi','prophet-muhammad','sahaba'],
  speaker: ['allah','angel','narrator','jibril'],
  quotedSpeaker: ['prophet-muhammad','musa','ibrahim','isa','nuh','yusuf','sulayman','zakariyya','maryam','iblis','pharaoh','qarun','disbelievers','angels','people-of-hell'],
  mode: ['command','prohibition','warning','promise','consolation','rebuke','praise','invitation','argument','reminder','lesson','supplication'],
  form: ['story','parable','oath','question','simile','dialogue','direct-statement','conditional','imperative','description'],
  tone: ['awe','hope','fear','peace','intimacy','majesty','urgency','sorrow'],
  people: ['musa','ibrahim','isa','maryam','muhammad','nuh','yusuf','sulayman','dawud','adam','iblis',"bani isra'il",'quraysh','ad','thamud'],
  places: ['mecca','madina','sinai','safa','marwa','kaaba','paradise','hellfire','barzakh','arsh','al-aqsa','egypt'],
  events: ['exodus','badr','uhud','isra',"mi'raj",'day-of-judgement','creation','flood','hijra','fath'],
  divineNames: ['ar-rahman','ar-rahim','al-ghafur','al-aziz','al-hakim','al-qadir','as-samee','al-baseer','al-aleem','al-khabeer','al-wali','al-malik','al-quddus','al-wahhab','al-lateef'],
}

export function getSeedsForLayer(layer: LayerName): string[] {
  return [...LAYER_SEEDS[layer]]
}
