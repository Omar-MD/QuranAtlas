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
  decorators: [
    /**
     * Inject UxNote annotation tool into Storybook preview.
     * Loads the vendored script after each story renders.
     */
    (storyFn, context) => {
      const html = storyFn()

      // Inject UxNote after DOM update
      requestAnimationFrame(() => {
        if (!document.getElementById('uxnote-script')) {
          const script = document.createElement('script')
          script.id = 'uxnote-script'
          script.src = '/uxnote.min.js'
          script.defer = true
          document.body.appendChild(script)
        }
      })

      return html
    },
  ],
}

export default preview
