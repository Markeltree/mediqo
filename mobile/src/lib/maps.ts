import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { PROVIDER_GOOGLE } from 'react-native-maps';

// Android always renders Google Maps. iOS uses Google only when a key is configured
// (a dev/EAS build with GOOGLE_MAPS_IOS_API_KEY); otherwise it falls back to Apple Maps.
const iosGoogleKey = Constants.expoConfig?.ios?.config?.googleMapsApiKey;
export const mapProvider = Platform.OS === 'android' || iosGoogleKey ? PROVIDER_GOOGLE : undefined;

// Google Maps on Android aborts the whole app when the build has no API key, so the map is only
// rendered once GOOGLE_MAPS_ANDROID_API_KEY (or GOOGLE_MAPS_API_KEY) is set. iOS can always use Apple Maps.
const androidKey = Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
export const mapsAvailable = Platform.OS !== 'android' || Boolean(androidKey);

/** Opens turn-by-turn directions in the Google Maps app (or the browser if it is not installed). */
export function openDirections(lat: number, lng: number) {
  return Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`);
}
