/** @type { import('@storybook/html').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile (375px)',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet (768px)',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '100%', height: '100%' },
        },
      },
      defaultViewport: 'desktop',
    },
    backgrounds: {
      values: [
        { name: 'Light', value: '#ffffff' },
        { name: 'Sepia', value: '#f5e6d3' },
        { name: 'Dark', value: '#0f0f13' },
      ],
      default: 'Light',
    },
    layout: 'fullscreen',
  },
}

export default preview
