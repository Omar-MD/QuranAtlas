import type { StorybookConfig } from '@storybook/react-vite'
import type { PluginOption } from 'vite'
import tailwindcss from '@tailwindcss/vite'

function withoutPwaPlugins(plugins: PluginOption[] | undefined): PluginOption[] | undefined {
  if (!Array.isArray(plugins)) return plugins
  return plugins
    .flatMap((plugin) => Array.isArray(plugin) ? withoutPwaPlugins(plugin) ?? [] : plugin)
    .filter((plugin) => {
      if (!plugin || typeof plugin !== 'object' || !('name' in plugin)) return true
      return !String(plugin.name).toLowerCase().includes('pwa')
    })
}

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: [
    { from: '../public/fonts', to: '/fonts' },
    { from: '../public/icons', to: '/icons' },
  ],
  viteFinal: async (config) => {
    config.plugins = withoutPwaPlugins(config.plugins) as typeof config.plugins
    config.plugins = [...(config.plugins ?? []), tailwindcss()]
    config.build = {
      ...config.build,
      chunkSizeWarningLimit: 1500,
      rolldownOptions: {
        ...config.build?.rolldownOptions,
        checks: {
          ...config.build?.rolldownOptions?.checks,
          pluginTimings: false,
        },
      },
    }
    return config
  },
}

export default config
