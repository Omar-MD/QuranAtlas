import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Check, Settings } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'

import {
  Accordion,
  Badge,
  Button,
  Checkbox,
  Dialog,
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
} from '../../../src-react/components/ui'

describe('React UI components', () => {
  it('renders button variants with composed classes', async () => {
    const onClick = vi.fn()
    render(
      <Button variant="primary" size="sm" onClick={onClick}>
        Continue
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Continue' })
    expect(button.className).toContain('qar:bg-accent')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('allows custom surfaces to opt out of default button chrome while keeping owned semantics', () => {
    render(<Button className="custom-row-button" unstyled>Jump</Button>)

    const button = screen.getByRole('button', { name: 'Jump' })
    expect(button.className).toBe('custom-row-button')
  })

  it('requires an accessible name for icon-only buttons', () => {
    render(
      <IconButton label="Open settings">
        <Settings aria-hidden="true" />
      </IconButton>,
    )

    expect(screen.getByRole('button', { name: 'Open settings' })).toBeInTheDocument()
  })

  it('renders native and Radix-backed form controls accessibly', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <Input label="Search" />
        <Textarea label="Notes" />
        <Select
          label="Riwayah"
          options={[
            { label: 'Qalun', value: 'qaloon' },
            { label: 'Hafs', value: 'hafs' },
          ]}
          defaultValue="qaloon"
        />
        <SegmentedControl
          label="Mode"
          options={[
            { label: 'Verse', value: 'verse' },
            { label: 'Mushaf', value: 'mushaf' },
          ]}
          value="verse"
          onValueChange={vi.fn()}
        />
        <Checkbox label="Downloaded" />
        <Switch label="Night mode" />
        <Slider label="Font size" defaultValue={[80]} min={70} max={130} />
      </div>,
    )

    expect(screen.getByLabelText('Search')).toBeInTheDocument()
    expect(screen.getByLabelText('Notes')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Riwayah' })).toHaveTextContent('Qalun')
    expect(screen.getByRole('tab', { name: 'Mode: Verse' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('checkbox', { name: 'Downloaded' }))
    expect(screen.getByRole('checkbox', { name: 'Downloaded' })).toHaveAttribute('data-state', 'checked')
    expect(screen.getByRole('switch', { name: 'Night mode' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Font size' })).toHaveAttribute('aria-valuenow', '80')
  })

  it('renders feedback primitives with semantic state', () => {
    render(
      <div>
        <Badge tone="success">Installed</Badge>
        <Progress value={40} label="Pack progress" />
        <Spinner label="Loading sources" />
      </div>,
    )

    expect(screen.getByText('Installed')).toHaveAttribute('data-tone', 'success')
    expect(screen.getByRole('progressbar', { name: 'Pack progress' })).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByRole('status', { name: 'Loading sources' })).toBeInTheDocument()
  })

  it('wraps behavior primitives behind owned APIs', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <Tooltip content="Opens storage controls">
          <Button>Storage</Button>
        </Tooltip>
        <Dialog title="Storage dialog" trigger={<Button>Open dialog</Button>}>
          Dialog body
        </Dialog>
        <Sheet title="Reader sheet" trigger={<Button>Open sheet</Button>}>
          Sheet body
        </Sheet>
        <Popover trigger={<Button>Open popover</Button>}>Popover body</Popover>
        <Toast title="Saved" description="Bookmark saved" open />
        <DropdownMenu
          trigger={<Button>Menu</Button>}
          items={[
            { label: 'Install', onSelect: vi.fn() },
            { label: 'Remove', destructive: true, onSelect: vi.fn() },
          ]}
        />
        <Tabs
          label="Reader tabs"
          items={[
            { label: 'Verse', value: 'verse', content: 'Verse content' },
            { label: 'Mushaf', value: 'mushaf', content: 'Mushaf content' },
          ]}
          defaultValue="verse"
        />
        <Accordion
          items={[
            { title: 'Details', content: 'Pack detail' },
          ]}
        />
      </div>,
    )

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    expect(screen.getByRole('dialog', { name: 'Storage dialog' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Open sheet' }))
    expect(screen.getByRole('dialog', { name: 'Reader sheet' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Open popover' }))
    expect(screen.getByText('Popover body')).toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.getByRole('menuitem', { name: 'Install' })).toBeInTheDocument()
    expect(screen.getByRole('tabpanel', { name: 'Verse' })).toHaveTextContent('Verse content')
    await user.click(screen.getByRole('button', { name: 'Details' }))
    expect(screen.getByText('Pack detail')).toBeInTheDocument()
  })

  it('renders a command list and disclosure helper', async () => {
    const user = userEvent.setup()
    const { Command, Disclosure } = await import('../../../src-react/components/ui')
    render(
      <div>
        <Command
          label="Commands"
          items={[
            { label: 'Go to Surah', icon: Check, onSelect: vi.fn() },
          ]}
        />
        <Disclosure title="More">Hidden detail</Disclosure>
      </div>,
    )

    expect(screen.getByRole('listbox', { name: 'Commands' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'More' }))
    expect(screen.getByText('Hidden detail')).toBeInTheDocument()
  })
})
