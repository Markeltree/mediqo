'use client';

import { useState } from 'react';
import { MapPicker, MAPS_ENABLED } from './MapPicker';

type Props = {
  lat: string;
  lng: string;
  /** `address` is set when the location came from a Google Maps place search. */
  onChange: (lat: string, lng: string, address?: string) => void;
};

/** Latitude/longitude inputs with a Google Maps picker and a "use my location" shortcut; patients find you by this point. */
export function LocationFields({ lat, lng, onChange }: Props) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const locate = () => {
    if (!navigator.geolocation) return setError('This browser cannot share location');
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError(MAPS_ENABLED ? 'Location permission denied. Search or click on the map instead.' : 'Location permission denied. Enter coordinates from Google Maps instead.');
        setLocating(false);
      }
    );
  };

  return (
    <div className="field full">
      <label>Map location</label>
      {MAPS_ENABLED && <MapPicker lat={lat} lng={lng} onChange={onChange} />}
      <div className="row">
        <input className="input" inputMode="decimal" placeholder="Latitude e.g. 24.8607" value={lat} onChange={(e) => onChange(e.target.value, lng)} required />
        <input className="input" inputMode="decimal" placeholder="Longitude e.g. 67.0011" value={lng} onChange={(e) => onChange(lat, e.target.value)} required />
        <button type="button" className="btn" onClick={locate} disabled={locating} style={{ height: 44, whiteSpace: 'nowrap' }}>
          {locating ? 'Locating…' : 'Use my location'}
        </button>
      </div>
      <div className="hint">
        {error || (MAPS_ENABLED
          ? 'Search for your building, or click / drag the pin to the exact entrance.'
          : 'Tip: in Google Maps, right-click your building and click the coordinates to copy them.')}
      </div>
    </div>
  );
}
