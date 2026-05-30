import type { Meta, StoryObj } from '@storybook/react'
import { Settings } from 'lucide-react'

import {
  Accordion,
  Badge,
  Button,
  Checkbox,
  Command,
  Dialog,
  Disclosure,
  DropdownMenu,
  IconButton,
  Input,
  Popover,
  Progress,
  SegmentedControl,
  Select,
  Sheet,
  Slider,
  Spinner,
  Switch,
  Tabs,
  Textarea,
  Toast,
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
        <IconButton label="Settings"><Settings aria-hidden="true" /></IconButton>
        <Badge tone="success">Installed</Badge>
        <Spinner label="Loading" />
      </div>
      <Progress label="Download progress" value={64} />
      <Input label="Search" />
      <Textarea label="Description" />
      <Select label="Riwayah" defaultValue="qaloon" options={[{ label: 'Qalun', value: 'qaloon' }, { label: 'Hafs', value: 'hafs' }]} />
      <SegmentedControl label="Mode" options={[{ label: 'Verse', value: 'verse' }, { label: 'Mushaf', value: 'mushaf' }]} defaultValue="verse" />
      <Checkbox label="Downloaded" />
      <Switch label="Night mode" />
      <Slider label="Font size" defaultValue={[100]} min={70} max={130} />
    </div>
  ),
}

export const Behavior: Story = {
  render: () => (
    <div className="qar:grid qar:max-w-3xl qar:gap-4 qar:bg-canvas qar:p-6 qar:text-text">
      <Tooltip content="Reader storage controls"><Button>Tooltip</Button></Tooltip>
      <Dialog title="Dialog" trigger={<Button>Open dialog</Button>}>Dialog content</Dialog>
      <Sheet title="Sheet" trigger={<Button>Open sheet</Button>}>Sheet content</Sheet>
      <Popover trigger={<Button>Open popover</Button>}>Popover content</Popover>
      <Toast title="Saved" description="Bookmark saved" open />
      <DropdownMenu trigger={<Button>Menu</Button>} items={[{ label: 'Install' }, { label: 'Remove', destructive: true }]} />
      <Tabs label="Reader tabs" items={[{ label: 'Verse', value: 'verse', content: 'Verse content' }, { label: 'Mushaf', value: 'mushaf', content: 'Mushaf content' }]} />
      <Accordion items={[{ title: 'Pack details', content: 'Install-before-activate state' }]} />
      <Command label="Commands" items={[{ label: 'Go to Surah', icon: Settings }]} />
      <Disclosure title="More">Disclosure content</Disclosure>
    </div>
  ),
}
