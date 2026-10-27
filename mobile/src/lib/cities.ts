export type City = { name: string; province: string; latitude: number; longitude: number };

// City centres. Discovery uses a radius around the point, so the exact spot only needs to be central.
export const CITIES: City[] = [
  { name: 'Karachi', province: 'Sindh', latitude: 24.8607, longitude: 67.0011 },
  { name: 'Lahore', province: 'Punjab', latitude: 31.5204, longitude: 74.3587 },
  { name: 'Islamabad', province: 'Capital Territory', latitude: 33.6844, longitude: 73.0479 },
  { name: 'Rawalpindi', province: 'Punjab', latitude: 33.5651, longitude: 73.0169 },
  { name: 'Faisalabad', province: 'Punjab', latitude: 31.4504, longitude: 73.135 },
  { name: 'Multan', province: 'Punjab', latitude: 30.1575, longitude: 71.5249 },
  { name: 'Peshawar', province: 'Khyber Pakhtunkhwa', latitude: 34.0151, longitude: 71.5249 },
  { name: 'Quetta', province: 'Balochistan', latitude: 30.1798, longitude: 66.975 },
  { name: 'Hyderabad', province: 'Sindh', latitude: 25.396, longitude: 68.3578 },
  { name: 'Gujranwala', province: 'Punjab', latitude: 32.1877, longitude: 74.1945 },
  { name: 'Sialkot', province: 'Punjab', latitude: 32.4945, longitude: 74.5229 },
  { name: 'Bahawalpur', province: 'Punjab', latitude: 29.3544, longitude: 71.6911 },
  { name: 'Sargodha', province: 'Punjab', latitude: 32.074, longitude: 72.6861 },
  { name: 'Sukkur', province: 'Sindh', latitude: 27.7052, longitude: 68.8574 },
  { name: 'Abbottabad', province: 'Khyber Pakhtunkhwa', latitude: 34.1688, longitude: 73.2215 },
];
