import React from 'react';
import { useRouter } from 'expo-router';
import { CityPickerSheet } from '../src/components/CityPicker';

/** "Choose your area" sheet, presented as a transparent modal over the tabs. */
export default function AreaScreen() {
  const router = useRouter();
  return <CityPickerSheet onClose={() => router.back()} />;
}
