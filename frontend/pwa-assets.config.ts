import { defineConfig, minimal2023Preset, combinePresetAndAppleSplashScreens } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: combinePresetAndAppleSplashScreens(
    minimal2023Preset,
    {
      padding: 0.3,
      resizeOptions: { background: '#0f172a', fit: 'contain' },
      darkResizeOptions: { background: '#020617', fit: 'contain' },
      linkMediaOptions: {
        log: true,
        addMediaScreen: true,
        basePath: '/',
      },
    },
  ),
  images: ['public/logo-topup.png'],
})
