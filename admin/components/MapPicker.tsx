'use client';

import { useEffect, useRef, useState } from 'react';

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
// Advanced markers need a map id; DEMO_MAP_ID works for development
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
export const MAPS_ENABLED = Boolean(MAPS_KEY);

const KARACHI = { lat: 24.8607, lng: 67.0011 };

let loader: Promise<any> | null = null;

/** Loads the Maps JavaScript API once per page. */
function loadGoogleMaps(): Promise<any> {
  const w = window as any;
  if (w.google?.maps?.importLibrary) return Promise.resolve(w.google.maps);
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    w.__mediqoMapsReady = () => resolve(w.google.maps);
    // Google calls this on an invalid or restricted key
    w.gm_authFailure = () => reject(new Error('Google Maps rejected the API key. Check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and its allowed referrers.'));
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&v=weekly&loading=async&libraries=places,marker&callback=__mediqoMapsReady`;
    script.async = true;
    script.onerror = () => {
      loader = null;
      reject(new Error('Could not load Google Maps. Check your connection.'));
    };
    document.head.appendChild(script);
  });
  return loader;
}

const parse = (lat: string, lng: string) => {
  const la = Number(lat);
  const ln = Number(lng);
  return lat && lng && Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180 ? { lat: la, lng: ln } : null;
};

type Props = { lat: string; lng: string; onChange: (lat: string, lng: string, address?: string) => void };

/** Google map with place search; click or drag the pin to set the point. */
export function MapPicker({ lat, lng, onChange }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const searchEl = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const setPoint = (pos: { lat: number; lng: number }, address?: string) =>
      onChangeRef.current(pos.lat.toFixed(6), pos.lng.toFixed(6), address);

    loadGoogleMaps()
      .then(async (gmaps) => {
        if (cancelled || !mapEl.current) return;
        const [{ Map }, { AdvancedMarkerElement, PinElement }, places] = await Promise.all([
          gmaps.importLibrary('maps'),
          gmaps.importLibrary('marker'),
          gmaps.importLibrary('places'),
        ]);
        if (cancelled || !mapEl.current) return;

        const start = parse(lat, lng);
        map.current = new Map(mapEl.current, {
          center: start ?? KARACHI,
          zoom: start ? 16 : 11,
          mapId: MAP_ID,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });

        const pin = new PinElement({ background: '#2563eb', borderColor: '#1d4ed8', glyphColor: '#fff', scale: 1.15 });
        marker.current = new AdvancedMarkerElement({
          map: map.current,
          position: start,
          gmpDraggable: true,
          content: pin.element,
          title: 'Drag to the exact entrance',
        });
        marker.current.addListener('dragend', () => {
          const p = marker.current.position;
          setPoint({ lat: typeof p.lat === 'function' ? p.lat() : p.lat, lng: typeof p.lng === 'function' ? p.lng() : p.lng });
        });
        map.current.addListener('click', (e: any) => {
          const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.current.position = pos;
          setPoint(pos);
        });

        // Place search (Places API (New)); skipped quietly if the key does not allow it
        if (places.PlaceAutocompleteElement && searchEl.current) {
          const auto = new places.PlaceAutocompleteElement({ includedRegionCodes: ['pk'] });
          auto.setAttribute('placeholder', 'Search your hospital or clinic on Google Maps');
          searchEl.current.replaceChildren(auto);
          const pick = async (place: any) => {
            await place.fetchFields({ fields: ['location', 'formattedAddress', 'viewport'] });
            if (!place.location) return;
            const pos = { lat: place.location.lat(), lng: place.location.lng() };
            marker.current.position = pos;
            if (place.viewport) map.current.fitBounds(place.viewport);
            else map.current.setCenter(pos);
            map.current.setZoom(Math.max(map.current.getZoom() ?? 0, 17));
            setPoint(pos, place.formattedAddress);
          };
          auto.addEventListener('gmp-select', (e: any) => pick(e.placePrediction.toPlace()));
          auto.addEventListener('gmp-placeselect', (e: any) => pick(e.place)); // older API versions
        }
        setReady(true);
      })
      .catch((e: Error) => !cancelled && setError(e.message));

    return () => {
      cancelled = true;
    };
    // Only on mount; later lat/lng changes are synced by the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Typed coordinates or "Use my location" move the pin
  useEffect(() => {
    if (!ready || !marker.current) return;
    const pos = parse(lat, lng);
    const cur = marker.current.position;
    const curLat = cur && (typeof cur.lat === 'function' ? cur.lat() : cur.lat);
    const curLng = cur && (typeof cur.lng === 'function' ? cur.lng() : cur.lng);
    if (!pos || (cur && Math.abs(curLat - pos.lat) < 1e-6 && Math.abs(curLng - pos.lng) < 1e-6)) return;
    marker.current.position = pos;
    map.current.panTo(pos);
    if ((map.current.getZoom() ?? 0) < 14) map.current.setZoom(16);
  }, [lat, lng, ready]);

  if (error) {
    return <div className="map-picker-error">{error}</div>;
  }

  return (
    <div className="map-picker">
      <div ref={searchEl} className="map-search" />
      <div className="map-frame">
        {/* Google owns this div's children, so React renders nothing inside it */}
        <div ref={mapEl} className="map-canvas" />
        {!ready && <div className="map-loading"><span className="spinner" /> Loading map…</div>}
      </div>
    </div>
  );
}
