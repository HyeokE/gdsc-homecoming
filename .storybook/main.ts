import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: '@storybook/react-vite',
  docs: { defaultName: '설명' },
  core: {
    disableTelemetry: true,
    allowedHosts: ['mac-black.taile6a871.ts.net'],
  },
}
export default config
