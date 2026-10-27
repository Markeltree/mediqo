import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentCoords, saveLocationToProfile, type Coords } from '../lib/location';
import { CITIES, type City } from '../lib/cities';
import { useAuth } from './AuthContext';

/** Where discovery searches around: the device (gps), a city the user picked, or the last location saved on their profile. */
export type Area = { coords: Coords; label: string; source: 'gps' | 'city' | 'saved' };
export type AreaStatus = 'locating' | 'ready' | 'unavailable';

type AreaState = {
  area: Area | null;
  status: AreaStatus;
  /** A city pins discovery to it; null goes back to the device location. Resolves to the area now in use. */
  chooseCity: (city: City | null) => Promise<Area | null>;
  refresh: () => Promise<void>;
};

const PREF_KEY = 'mediqo_area_city';
const AreaContext = createContext<AreaState | null>(null);

const readPref = async () => {
  try {
    const name = await AsyncStorage.getItem(PREF_KEY);
    return CITIES.find((c) => c.name === name) ?? null;
  } catch {
    return null;
  }
};

const cityArea = (c: City): Area => ({ coords: { latitude: c.latitude, longitude: c.longitude }, label: c.name, source: 'city' });

export function AreaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [area, setArea] = useState<Area | null>(null);
  const [status, setStatus] = useState<AreaStatus>('locating');
  // Ignore results from a resolve that a newer one has replaced
  const runId = useRef(0);

  const saved = user?.location?.coordinates;
  const savedAddress = user?.location?.address;

  const resolve = useCallback(async (): Promise<Area | null> => {
    const run = ++runId.current;
    setStatus('locating');

    let next: Area | null = null;
    const pinned = await readPref();
    if (pinned) {
      next = cityArea(pinned);
    } else {
      const coords = await getCurrentCoords();
      if (coords) {
        next = { coords, label: 'Current location', source: 'gps' };
        saveLocationToProfile(coords)
          .then((name) => {
            if (name && run === runId.current) setArea((a) => (a?.source === 'gps' ? { ...a, label: name } : a));
          })
          .catch(() => undefined);
      } else if (saved) {
        next = { coords: { latitude: saved[1], longitude: saved[0] }, label: savedAddress ?? 'Last known location', source: 'saved' };
      }
    }

    if (run !== runId.current) return next;
    setArea(next);
    setStatus(next ? 'ready' : 'unavailable');
    return next;
    // Saved coordinates are only a fallback; re-resolving when they change would loop with saveLocationToProfile
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (user) resolve();
  }, [user?.id, resolve]);

  const chooseCity = async (city: City | null) => {
    try {
      if (city) await AsyncStorage.setItem(PREF_KEY, city.name);
      else await AsyncStorage.removeItem(PREF_KEY);
    } catch {
      // Storage failing only means the choice is not remembered next launch
    }
    if (!city) return resolve();
    runId.current++;
    const next = cityArea(city);
    setArea(next);
    setStatus('ready');
    return next;
  };

  const refresh = async () => {
    await resolve();
  };

  return <AreaContext.Provider value={{ area, status, chooseCity, refresh }}>{children}</AreaContext.Provider>;
}

export function useArea() {
  const ctx = useContext(AreaContext);
  if (!ctx) throw new Error('useArea must be used inside AreaProvider');
  return ctx;
}
