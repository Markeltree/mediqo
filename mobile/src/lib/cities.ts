import { CITY_ROWS } from './cities.data';
import type { Coords } from './location';

/** A place discovery can search around. `region` is the subtitle, e.g. "Sindh, Pakistan". */
export type City = { name: string; region: string; latitude: number; longitude: number };

type Indexed = City & { population: number; key: string };

const fold = (s: string) => {
  let out = s.toLowerCase();
  try {
    out = out.normalize('NFD').replace(/[̀-ͯ]/g, '');
  } catch {
    // Older engines without normalize(): accented input simply matches less
  }
  return out;
};

let index: Indexed[] | null = null;

// Built on first use: ~4,000 world cities from GeoNames, largest first
function cities(): Indexed[] {
  if (!index) {
    index = CITY_ROWS.map(([name, region, country, latitude, longitude, population, ascii]) => ({
      name,
      region: [region, country].filter(Boolean).join(', '),
      latitude,
      longitude,
      population,
      key: fold(`${name} ${ascii ?? ''}`),
    }));
  }
  return index;
}

const strip = ({ name, region, latitude, longitude }: Indexed): City => ({ name, region, latitude, longitude });

/** The biggest cities, for the picker before the user types or has a location. */
export function popularCities(limit = 30): City[] {
  return cities().slice(0, limit).map(strip);
}

function distanceKm(a: Coords, b: Coords) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Cities closest to a point, nearest first. */
export function citiesNear(point: Coords, limit = 30): City[] {
  return cities()
    .map((c) => ({ c, d: distanceKm(point, c) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map(({ c }) => strip(c));
}

/** Name matches first (prefix beats contains), then region or country matches; bigger cities break ties. */
export function searchCities(query: string, limit = 40): City[] {
  const q = fold(query.trim());
  if (!q) return [];
  const scored: { c: Indexed; score: number }[] = [];
  for (const c of cities()) {
    let score = -1;
    if (c.key.startsWith(q)) score = 0;
    else if (c.key.includes(` ${q}`)) score = 1;
    else if (c.key.includes(q)) score = 2;
    else if (fold(c.region).includes(q)) score = 3;
    if (score >= 0) scored.push({ c, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || b.c.population - a.c.population)
    .slice(0, limit)
    .map(({ c }) => strip(c));
}

/** Finds a city by name, preferring one in `country` and then the largest; restores choices saved by older app versions. */
export function findCityByName(name: string, country?: string): City | null {
  const matches = cities().filter((x) => x.name === name);
  const c = (country && matches.find((x) => x.region.endsWith(country))) || matches[0];
  return c ? strip(c) : null;
}

export const sameCity = (a: City | Coords | null | undefined, b: City | Coords | null | undefined) =>
  !!a && !!b && Math.abs(a.latitude - b.latitude) < 0.01 && Math.abs(a.longitude - b.longitude) < 0.01;
