const isWindows = process.platform === 'win32';

export default ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    [
      'expo-build-properties',
      {
        android: isWindows ? { cmakeVersion: '3.31.6' } : {},
      },
    ],
  ],
});
