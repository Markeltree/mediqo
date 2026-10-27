import * as Location from 'expo-location';
import { api } from './api';

export type Coords = { latitude: number; longitude: number };

const GPS_TIMEOUT_MS = 8000;

/**
 * Requests foreground permission and returns the device's coordinates, or null when permission is denied,
 * location services are off, or no fix arrives in time. Never throws.
 */
export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    if (!(await Location.hasServicesEnabledAsync())) return null;

    // A recent cached fix is instant; a fresh one can take seconds or never arrive indoors
    const pos =
      (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 })) ??
      (await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), GPS_TIMEOUT_MS)),
      ]));
    return pos ? { latitude: pos.coords.latitude, longitude: pos.coords.longitude } : null;
  } catch {
    return null;
  }
}

/** Saves the device location on the user's profile so the server can do proximity queries. Returns the area name. */
export async function saveLocationToProfile(c: Coords) {
  const [place] = await Location.reverseGeocodeAsync(c).catch(() => []);
  const address = place ? [place.district, place.city].filter(Boolean).join(', ') : undefined;
  await api.put('/auth/location', { lat: c.latitude, lng: c.longitude, address });
  return address;
}
