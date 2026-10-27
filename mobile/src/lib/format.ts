/** "850 m", "7.3 km", "1,029 km": decimals only where they mean something. */
export function formatKm(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}
