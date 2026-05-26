import type { Preview } from '@storybook/react'
import '../src-react/design-system/index.css'

const preview: Preview = {
  parameters: {
    a11y: {
      test: 'error',
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile 375', styles: { width: '375px', height: '812px' } },
        smallMobile: { name: 'Small Mobile 320', styles: { width: '320px', height: '568px' } },
        tablet: { name: 'Tablet 768', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop 1280', styles: { width: '1280px', height: '900px' } },
      },
    },
  },
  globalTypes: {
    theme: {
      toolbar: {
        title: 'Theme',
        items: ['light', 'sepia', 'dark'],
      },
      defaultValue: 'light',
    },
    reducedMotion: {
      toolbar: {
        title: 'Motion',
        items: ['default', 'reduced'],
      },
      defaultValue: 'default',
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === 'light' ? '' : String(context.globals.theme)
      document.documentElement.dataset.theme = theme
      document.documentElement.dataset.motion = String(context.globals.reducedMotion)
      return <Story />
    },
  ],
}

export default preview
