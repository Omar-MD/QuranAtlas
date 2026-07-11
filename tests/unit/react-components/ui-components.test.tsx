import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Check, Settings } from 'lucide-react'
import { useState } from 'react'
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
} from '../../../src/components/ui'

describe('React UI components', () => {
  it('renders button variants with accessible click behavior', async () => {
    const onClick = vi.fn()
    render(
      <Button variant="primary" size="sm" onClick={onClick}>
        Continue
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Continue' })
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
    const onModeChange = vi.fn()
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
          onValueChange={onModeChange}
        />
        <Checkbox label="Downloaded" />
        <Switch label="Night mode" defaultChecked />
        <Slider label="Font size" defaultValue={[80]} min={70} max={130} />
      </div>,
    )

    expect(screen.getByLabelText('Search')).toBeInTheDocument()
    expect(screen.getByLabelText('Notes')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Riwayah' })).toHaveTextContent('Qalun')
    expect(screen.getByRole('radiogroup', { name: 'Mode' })).toBeInTheDocument()
    const verseMode = screen.getByRole('radio', { name: 'Mode: Verse' })
    expect(verseMode).toHaveAttribute('aria-checked', 'true')
    verseMode.focus()
    await user.keyboard('{ArrowRight}')
    expect(onModeChange).toHaveBeenCalledWith('mushaf')
    await user.click(screen.getByRole('checkbox', { name: 'Downloaded' }))
    expect(screen.getByRole('checkbox', { name: 'Downloaded' })).toHaveAttribute('data-state', 'checked')
    const nightMode = screen.getByRole('switch', { name: 'Night mode' })
    expect(nightMode).toBeChecked()
    await user.click(nightMode)
    expect(nightMode).not.toBeChecked()
    expect(screen.getByRole('slider', { name: 'Font size' })).toHaveAttribute('aria-valuenow', '80')
  })

  it('keeps segmented control keyboard selection on enabled radio options', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <SegmentedControl
        defaultValue="disabled"
        label="Mode"
        onValueChange={onValueChange}
        options={[
          { disabled: true, label: 'Disabled', value: 'disabled' },
          { label: 'Verse', value: 'verse' },
          { disabled: true, label: 'Audio', value: 'audio' },
          { label: 'Mushaf', value: 'mushaf' },
        ]}
      />,
    )

    const disabled = screen.getByRole('radio', { name: 'Mode: Disabled' })
    const verse = screen.getByRole('radio', { name: 'Mode: Verse' })
    const mushaf = screen.getByRole('radio', { name: 'Mode: Mushaf' })

    expect(disabled).toHaveAttribute('aria-checked', 'false')
    expect(disabled).toHaveAttribute('tabindex', '-1')
    expect(verse).toHaveAttribute('aria-checked', 'true')
    expect(verse).toHaveAttribute('tabindex', '0')

    verse.focus()
    await user.keyboard('{ArrowRight}')
    expect(onValueChange).toHaveBeenLastCalledWith('mushaf')
    expect(mushaf).toHaveFocus()
    expect(mushaf).toHaveAttribute('aria-checked', 'true')

    await user.keyboard('{ArrowLeft}')
    expect(onValueChange).toHaveBeenLastCalledWith('verse')
    expect(verse).toHaveFocus()
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

  it('owns adaptive Sheet modal semantics, Escape dismissal, and explicit return focus', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    function AdaptiveSheetHarness() {
      const [open, setOpen] = useState(true)
      return (
        <>
          <Button id="settings-test-opener">Open owned settings</Button>
          <Sheet
            closeLabel="Close owned settings"
            onOpenChange={(nextOpen) => {
              onOpenChange(nextOpen)
              setOpen(nextOpen)
            }}
            open={open}
            returnFocusId="settings-test-opener"
            title="Verse settings"
            variant="adaptive-settings"
          >
            Adaptive settings body
          </Sheet>
        </>
      )
    }

    const { rerender } = render(<AdaptiveSheetHarness />)
    expect(screen.getByRole('dialog', { name: 'Verse settings' })).toHaveAttribute('aria-modal', 'true')

    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenLastCalledWith(false)

    rerender(<AdaptiveSheetHarness key="explicit-close" />)
    await user.click(screen.getByRole('button', { name: 'Close owned settings' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open owned settings' })).toHaveFocus())
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('renders a command list and disclosure helper', async () => {
    const user = userEvent.setup()
    const { Command, Disclosure } = await import('../../../src/components/ui')
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
