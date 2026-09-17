import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, Settings, WifiOff, X } from 'lucide-react'

import {
  Accordion,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  IconButton,
  Input,
  ListRow,
  Progress,
  SegmentedControl,
  Select,
  Sheet,
  SheetBody,
  Slider,
  Spinner,
  Status,
  Stepper,
  Switch,
  Tabs,
  TileGroup,
  Tooltip,
} from '.'

const meta = {
  title: 'React Design System/UI',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta

export default meta

type Story = StoryObj

export const Primitives: Story = {
  render: () => (
    <div className="qar:grid qar:max-w-3xl qar:gap-4 qar:bg-canvas qar:p-6 qar:text-text">
      <div className="qar:flex qar:flex-wrap qar:items-center qar:gap-2">
        <Button variant="primary">Download pages</Button>
        <Button variant="primary" loading>
          Download pages
        </Button>
        <Button>Change edition</Button>
        <Button disabled>Disabled</Button>
        <IconButton label="Bookmarks">
          <Settings aria-hidden="true" />
        </IconButton>
        <Badge tone="success">Downloaded</Badge>
        <Spinner label="Loading" />
      </div>
      <Progress label="Download progress" value={64} />
      <Input label="Filter surahs" />
      <Select label="Translation" defaultValue="bridges" options={[{ label: 'Bridges', value: 'bridges' }]} />
      <SegmentedControl
        label="View"
        options={[
          { label: 'Verses', value: 'verse' },
          { label: 'Mushaf', value: 'mushaf' },
        ]}
        defaultValue="verse"
      />
      <Checkbox label="Downloaded" />
      <Switch label="Dim page images" />
      <Checkbox disabled label="Downloaded (disabled)" />
      <Switch disabled label="Dim page images (disabled)" />
      <Slider label="Page zoom" defaultValue={[100]} min={0} max={100} />
    </div>
  ),
}

export const Behavior: Story = {
  render: () => (
    <div className="qar:grid qar:max-w-3xl qar:gap-4 qar:bg-canvas qar:p-6 qar:text-text">
      <Tooltip content="Reader storage controls">
        <Button>Tooltip</Button>
      </Tooltip>
      <Dialog title="Dialog" trigger={<Button>Open dialog</Button>}>
        Dialog content
      </Dialog>
      <Sheet title="Sheet" trigger={<Button>Open sheet</Button>}>
        Sheet content
      </Sheet>
      <Tabs
        label="Selector tabs"
        items={[
          { label: 'Surahs', value: 'surahs', content: 'Surah content' },
          { label: 'Juz', value: 'juz', content: 'Juz content' },
        ]}
      />
      <Accordion items={[{ title: 'Pack details', content: 'Install-before-activate state' }]} />
    </div>
  ),
}

export const AdaptiveSettingsSheetOpen: Story = {
  parameters: { layout: 'fullscreen', viewport: { defaultViewport: 'mobile' } },
  render: () => (
    <Sheet closeLabel="Close settings" onOpenChange={() => undefined} open title="Settings" variant="adaptive-settings">
      <SheetBody className="qar-react-settings-shell">
        <div className="qar-react-settings-body">
          <section aria-labelledby="adaptive-sheet-heading" className="qar-react-settings-section">
            <p className="qar-eyebrow" id="adaptive-sheet-heading">
              Reading
            </p>
            <div className="qar-react-settings-panel-controls qar:p-4">Adaptive Settings sheet body</div>
          </section>
        </div>
      </SheetBody>
    </Sheet>
  ),
}

export const StatusStates: Story = {
  render: () => (
    <div className="qar:grid qar:max-w-3xl qar:gap-4 qar:bg-canvas qar:p-6 qar:text-text">
      <Status tone="info" title="Reference copied" />
      <Status
        icon={<Info aria-hidden="true" size={18} />}
        tone="info"
        title="Reader text is loading"
        description="Verses become available once the reader text finishes loading."
      />
      <Status
        description="All installed packs are available offline."
        icon={<CheckCircle2 aria-hidden="true" size={18} />}
        tone="success"
        title="Included assets ready"
      />
      <Status
        action={
          <Button size="sm" variant="secondary">
            Try again
          </Button>
        }
        description="Translations from the network are unavailable until you reconnect."
        icon={<WifiOff aria-hidden="true" size={18} />}
        tone="warning"
        title="You are offline"
      />
      <Status
        action={
          <>
            <Button size="sm" variant="secondary">
              Manage assets
            </Button>
            <Button size="sm" variant="secondary">
              Try again
            </Button>
          </>
        }
        description="The Qaloon page pack is missing. Manage assets or retry the download."
        icon={<AlertTriangle aria-hidden="true" size={18} />}
        tone="error"
        title="Mushaf page pack could not be loaded"
      />
    </div>
  ),
}

export const ListRows: Story = {
  render: () => (
    <div className="qar:max-w-3xl qar:bg-canvas qar:p-6 qar:text-text">
      <ListRow arabic="الفاتحة" meta="7 verses" num={1} onSelect={() => undefined} title="Al-Fātiḥah" />
      <ListRow arabic="البقرة" meta="286 verses" onSelect={() => undefined} selected title="Al-Baqarah" />
      <ListRow arabic="آل عمران" current meta="200 verses" onSelect={() => undefined} title="Āl-ʿImrān" />
      <ListRow
        action={
          <IconButton label="Remove bookmark from An-Nisā 1:1">
            <X aria-hidden="true" size={16} />
          </IconButton>
        }
        arabic="النساء"
        meta="176 verses"
        onSelect={() => undefined}
        title="An-Nisā"
      />
      <ListRow
        arabic="سورة طويلة جداً من الأسماء العربية في المصحف الشريف لاختبار العرض"
        meta="A long meta line describing verse count, revelation order, and page range for this surah"
        onSelect={() => undefined}
        title="Al-Anʿām — The Cattle, a long Latin title that wraps onto a second line in narrow viewports"
      />
    </div>
  ),
}

export const Cards: Story = {
  render: () => (
    <div className="qar:grid qar:max-w-3xl qar:gap-4 qar:bg-canvas qar:p-6 qar:text-text">
      <Card title="Continue reading">Surah Al-Baqarah · Ayah 255</Card>
      <Card>Flat card without a header</Card>
    </div>
  ),
}

export const SegmentedControlSelected: Story = {
  render: () => (
    <div className="qar:grid qar:gap-4 qar:bg-canvas qar:p-6 qar:text-text">
      <SegmentedControl
        defaultValue="sepia"
        label="Theme"
        options={[
          { label: 'Light', value: 'light' },
          { label: 'Sepia', value: 'sepia' },
          { label: 'Dark', value: 'dark' },
          { label: 'System', value: 'auto' },
        ]}
      />
      <SegmentedControl
        compact
        defaultValue="verse"
        label="View"
        options={[
          { label: 'Verses', value: 'verse' },
          { label: 'Mushaf', value: 'mushaf' },
        ]}
      />
    </div>
  ),
}

export const NavigationDrawerSheetMobile: Story = {
  parameters: { layout: 'fullscreen', viewport: { defaultViewport: 'mobile' } },
  render: () => (
    <div>
      <main className="qar:p-6">Reader canvas beneath the modal drawer scrim.</main>
      <Sheet
        closeLabel="Close navigation"
        onOpenChange={() => undefined}
        open
        title="Navigate"
        variant="navigation-drawer"
      >
        <div className="qar:grid qar:gap-1 qar:p-3">
          <ListRow onSelect={() => undefined} title="Surahs" />
          <ListRow onSelect={() => undefined} title="Bookmarks" />
          <ListRow current onSelect={() => undefined} title="Settings" />
        </div>
      </Sheet>
    </div>
  ),
}

export const NavigationDrawerSheetDesktop: Story = {
  parameters: { layout: 'fullscreen', viewport: { defaultViewport: 'desktop' } },
  render: () => (
    <div>
      <main className="qar:p-6">Reader canvas beneath the modal drawer scrim on desktop too.</main>
      <Sheet
        closeLabel="Close navigation"
        onOpenChange={() => undefined}
        open
        title="Navigate"
        variant="navigation-drawer"
      >
        <div className="qar:grid qar:gap-1 qar:p-3">
          <ListRow onSelect={() => undefined} title="Surahs" />
          <ListRow onSelect={() => undefined} title="Bookmarks" />
          <ListRow current onSelect={() => undefined} title="Settings" />
        </div>
      </Sheet>
    </div>
  ),
}

export const NavigationDrawerSheetTrigger: Story = {
  parameters: { layout: 'fullscreen', viewport: { defaultViewport: 'desktop' } },
  render: () => (
    <main className="qar:p-6">
      <Sheet
        closeLabel="Close navigation"
        title="Navigate"
        trigger={<Button>Open navigation</Button>}
        variant="navigation-drawer"
      >
        <div className="qar:grid qar:gap-1 qar:p-3">
          <ListRow onSelect={() => undefined} title="Surahs" />
          <ListRow onSelect={() => undefined} title="Bookmarks" />
          <ListRow current onSelect={() => undefined} title="Settings" />
        </div>
      </Sheet>
    </main>
  ),
}

// TileGroup stories (brief §10): theme, spacing, selected, focus-visible,
// disabled. Visuals mirror the ThemeControls and VerseReadingControls usage.
function TileGroupStories() {
  const [theme, setTheme] = useState('light')
  const [spacing, setSpacing] = useState('md')
  const themeOptions = [
    { label: 'Light', value: 'light', visual: <ThemeTileSample sample="light" /> },
    { label: 'Sepia', value: 'sepia', visual: <ThemeTileSample sample="sepia" /> },
    { label: 'Dark', value: 'dark', visual: <ThemeTileSample sample="dark" /> },
    { label: 'System', value: 'auto', visual: <ThemeTileSample sample="system" /> },
  ]
  return (
    <div className="qar:grid qar:max-w-3xl qar:gap-6 qar:bg-canvas qar:p-6 qar:text-text">
      <TileGroup label="Theme" onValueChange={setTheme} options={themeOptions} value={theme} />
      <TileGroup
        label="Verse spacing"
        onValueChange={setSpacing}
        options={[
          { label: 'Compact', value: 'xs', visual: <SpacingBars gap={3} /> },
          { label: 'Comfortable', value: 'md', visual: <SpacingBars gap={6} /> },
          { label: 'Spacious', value: 'xl', visual: <SpacingBars gap={10} /> },
        ]}
        value={spacing}
      />
      <TileGroup
        label="Verse spacing with disabled option"
        onValueChange={setSpacing}
        options={[
          { label: 'Compact', value: 'xs', visual: <SpacingBars gap={3} /> },
          { label: 'Comfortable', value: 'md', visual: <SpacingBars gap={6} /> },
          { disabled: true, label: 'Spacious', value: 'xl', visual: <SpacingBars gap={10} /> },
        ]}
        value={spacing}
      />
    </div>
  )
}

function ThemeTileSample({ sample }: { sample: 'light' | 'sepia' | 'dark' | 'system' }) {
  if (sample === 'system') {
    return (
      <span aria-hidden="true" className="qar-react-theme-tile qar-react-theme-tile--system">
        <span className="qar-react-theme-tile-half" data-sample="light">
          <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--ink" />
          <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--muted" />
          <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--accent" />
        </span>
        <span className="qar-react-theme-tile-half" data-sample="dark">
          <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--ink" />
          <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--muted" />
          <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--accent" />
        </span>
      </span>
    )
  }
  return (
    <span aria-hidden="true" className="qar-react-theme-tile" data-sample={sample}>
      <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--ink" />
      <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--muted" />
      <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--accent" />
    </span>
  )
}

function SpacingBars({ gap }: { gap: number }) {
  const block = 5.5
  const top = (24 - (block * 2 + gap)) / 2
  return (
    <svg aria-hidden="true" fill="none" height={24} viewBox="0 0 28 24" width={28}>
      <rect fill="currentColor" height={2} rx={0.75} width={20} x={4} y={top} />
      <rect className="qar-react-spacing-glyph-muted" height={1.5} rx={0.75} width={14} x={4} y={top + 3.5} />
      <rect fill="currentColor" height={2} rx={0.75} width={20} x={4} y={top + block + gap} />
      <rect
        className="qar-react-spacing-glyph-muted"
        height={1.5}
        rx={0.75}
        width={14}
        x={4}
        y={top + block + gap + 3.5}
      />
    </svg>
  )
}

export const TileGroupStates: Story = {
  render: () => <TileGroupStories />,
}

// Stepper stories (brief §10): reading-face glyphs and the endpoint-disabled
// states.
export const StepperStates: Story = {
  render: () => (
    <div className="qar:grid qar:max-w-3xl qar:gap-4 qar:bg-canvas qar:p-6 qar:text-text">
      <Stepper
        glyph="arabic"
        label="Arabic size"
        onValueChange={() => undefined}
        options={[
          { label: 'Default', value: 'md' },
          { label: 'Large', value: 'lg' },
          { label: 'Largest', value: 'xl' },
        ]}
        value="md"
      />
      <Stepper
        glyph="latin"
        label="Translation size"
        onValueChange={() => undefined}
        options={[
          { label: 'Smallest', value: 'xs' },
          { label: 'Small', value: 'sm' },
          { label: 'Default', value: 'md' },
          { label: 'Large', value: 'lg' },
          { label: 'Largest', value: 'xl' },
        ]}
        value="md"
      />
      <Stepper
        glyph="arabic"
        label="Arabic size at endpoints"
        onValueChange={() => undefined}
        options={[
          { label: 'Smallest', value: 'xs' },
          { label: 'Default', value: 'md' },
          { label: 'Largest', value: 'xl' },
        ]}
        value="md"
      />
    </div>
  ),
}
