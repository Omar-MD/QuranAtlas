import { Accordion } from '../ui'

export function SearchExplorePanel() {
  return (
    <div className="qar:grid qar:gap-3">
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        Advanced Explore sections load from later Search feature packs. Core Search results remain available when optional packs are missing.
      </p>
      <Accordion
        items={[
          {
            title: 'Same written form',
            content: 'Unavailable until an optional Search feature pack is active.',
            value: 'same-written-form',
          },
          {
            title: 'Counts & patterns',
            content: 'Unavailable until counts and pattern packs are active.',
            value: 'counts-patterns',
          },
        ]}
      />
    </div>
  )
}
