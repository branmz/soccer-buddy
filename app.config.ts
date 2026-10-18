import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json holds the static config; this only changes what differs per build. The development
// build (`APP_VARIANT=development`, set by the eas.json profile) gets its own package and name,
// so it installs next to the preview APK instead of replacing it (and keeps its own database).
const IS_DEV = process.env.APP_VARIANT === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'Coach Buddy (Dev)' : (config.name ?? 'Coach Buddy'),
  slug: config.slug ?? 'coach-buddy',
  android: {
    ...config.android,
    package: IS_DEV ? 'com.branmz.coachbuddy.dev' : config.android?.package,
  },
});
