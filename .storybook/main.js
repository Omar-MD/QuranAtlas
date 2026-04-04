/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
  stories: ['../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  staticDirs: ['../public', '../storybook'],
  async viteFinal(config) {
    // Keep only Storybook plugins, remove all project plugins (including PWA)
    const storybookPlugins = (config.plugins || []).filter(
      (plugin) => plugin && plugin.name && plugin.name.startsWith('storybook:')
    )
    config.plugins = storybookPlugins
    return config
  },
}

export default config
