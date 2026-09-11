import type { Meta, StoryObj } from '@storybook/react'
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
  Switch,
  Tabs,
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
      <div className="qar:flex qar:flex-wrap qar:gap-2">
        <Button variant="primary">Primary</Button>
        <Button>Secondary</Button>
        <IconButton label="Settings">
          <Settings aria-hidden="true" />
        </IconButton>
        <Badge tone="success">Installed</Badge>
        <Spinner label="Loading" />
      </div>
      <Progress label="Download progress" value={64} />
      <Input label="Search" />
      <Select
        label="Riwayah"
        defaultValue="qaloon"
        options={[
          { label: 'Qalun', value: 'qaloon' },
          { label: 'Hafs', value: 'hafs' },
        ]}
      />
      <SegmentedControl
        label="Mode"
        options={[
          { label: 'Verse', value: 'verse' },
          { label: 'Mushaf', value: 'mushaf' },
        ]}
        defaultValue="verse"
      />
      <Checkbox label="Downloaded" />
      <Switch label="Night mode" />
      <Checkbox disabled label="Downloaded (disabled)" />
      <Switch disabled label="Night mode (disabled)" />
      <Slider label="Font size" defaultValue={[100]} min={70} max={130} />
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
        label="Reader tabs"
        items={[
          { label: 'Verse', value: 'verse', content: 'Verse content' },
          { label: 'Mushaf', value: 'mushaf', content: 'Mushaf content' },
        ]}
      />
      <Accordion items={[{ title: 'Pack details', content: 'Install-before-activate state' }]} />
    </div>
  ),
}

export const AdaptiveSettingsSheetOpen: Story = {
  parameters: { layout: 'fullscreen', viewport: { defaultViewport: 'mobile' } },
  render: () => (
    <Sheet
      closeLabel="Close settings"
      onOpenChange={() => undefined}
      open
      title="Verse settings"
      variant="adaptive-settings"
    >
      <SheetBody className="qar-react-settings-shell">
        <div className="qar-react-settings-body">
          <section aria-labelledby="adaptive-sheet-heading" className="qar-react-settings-group">
            <header className="qar-react-settings-group-heading">
              <h3 id="adaptive-sheet-heading">Verse reading</h3>
            </header>
            <div className="qar-react-settings-group-content qar:p-4">Adaptive Settings sheet body</div>
          </section>
        </div>
      </SheetBody>
    </Sheet>
  ),
}

export const StatusStates: Story = {
  render: () => (
    <div className="qar:grid qar:max-w-3xl qar:gap-4 qar:bg-canvas qar:p-6 qar:text-text">
      <Status tone="info" title="Enter a word, phrase, or ayah reference" />
      <Status
        icon={<Info aria-hidden="true" size={18} />}
        tone="info"
        title="Search index is loading"
        description="Verses become searchable once the index finishes loading."
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
            Retry
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
              Retry
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
          <IconButton label="Remove bookmark for An-Nisā">
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
      <Card>Onboarding edition card without a header</Card>
    </div>
  ),
}

export const SegmentedControlSelected: Story = {
  render: () => (
    <div className="qar:bg-canvas qar:p-6 qar:text-text">
      <SegmentedControl
        defaultValue="sepia"
        label="Theme"
        options={[
          { label: 'Light', value: 'light' },
          { label: 'Sepia', value: 'sepia' },
          { label: 'Dark', value: 'dark' },
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
          <ListRow arabic="الفاتحة" meta="7 verses" onSelect={() => undefined} title="Al-Fātiḥah" />
          <ListRow arabic="البقرة" current meta="286 verses" onSelect={() => undefined} title="Al-Baqarah" />
          <ListRow arabic="آل عمران" meta="200 verses" onSelect={() => undefined} title="Āl-ʿImrān" />
        </div>
      </Sheet>
    </div>
  ),
}

export const NavigationDrawerSheetDesktop: Story = {
  parameters: { layout: 'fullscreen', viewport: { defaultViewport: 'desktop' } },
  render: () => (
    <div>
      <main className="qar:p-6">Reader canvas stays interactive beside the desktop drawer rail.</main>
      <Sheet
        closeLabel="Close navigation"
        onOpenChange={() => undefined}
        open
        title="Navigate"
        variant="navigation-drawer"
      >
        <div className="qar:grid qar:gap-1 qar:p-3">
          <ListRow arabic="الفاتحة" meta="7 verses" onSelect={() => undefined} title="Al-Fātiḥah" />
          <ListRow arabic="البقرة" current meta="286 verses" onSelect={() => undefined} title="Al-Baqarah" />
          <ListRow arabic="آل عمران" meta="200 verses" onSelect={() => undefined} title="Āl-ʿImrān" />
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
          <ListRow arabic="الفاتحة" meta="7 verses" onSelect={() => undefined} title="Al-Fātiḥah" />
          <ListRow arabic="البقرة" current meta="286 verses" onSelect={() => undefined} title="Al-Baqarah" />
          <ListRow arabic="آل عمران" meta="200 verses" onSelect={() => undefined} title="Āl-ʿImrān" />
        </div>
      </Sheet>
    </main>
  ),
}
