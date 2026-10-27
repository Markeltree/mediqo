// Fills the API keys in app.json from mobile/.env (Expo CLI loads it automatically).
// Copy .env.example to .env and set the values; app.json keeps the non-secret defaults.
module.exports = ({ config }) => {
  const env = process.env;
  const androidMapsKey = env.GOOGLE_MAPS_ANDROID_API_KEY || env.GOOGLE_MAPS_API_KEY;
  const iosMapsKey = env.GOOGLE_MAPS_IOS_API_KEY || env.GOOGLE_MAPS_API_KEY;

  return {
    ...config,
    ios: {
      ...config.ios,
      ...(iosMapsKey && { config: { ...config.ios?.config, googleMapsApiKey: iosMapsKey } }),
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: { apiKey: androidMapsKey || config.android?.config?.googleMaps?.apiKey },
      },
    },
    extra: {
      ...config.extra,
      apiUrl: env.EXPO_PUBLIC_API_URL || config.extra?.apiUrl,
      eas: { ...config.extra?.eas, projectId: env.EAS_PROJECT_ID || config.extra?.eas?.projectId },
    },
  };
};
