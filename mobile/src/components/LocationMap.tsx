import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { mapProvider, openDirections } from '../lib/maps';
import { colors, radius, shadowLg } from '../theme';
import { Text } from './ui/Text';

type Props = {
  lat: number;
  lng: number;
  title: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
  /** Space below the Directions button, for content that overlaps the map's bottom edge. */
  bottomInset?: number;
};

/** A static Google map with a branded pin and a "Directions" button. */
export function LocationMap({ lat, lng, title, icon = 'medkit', style, bottomInset = 12 }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <MapView
        provider={mapProvider}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsPointsOfInterest={false}
      >
        <Marker coordinate={{ latitude: lat, longitude: lng }} title={title} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.pinWrap}>
            <View style={styles.pin}>
              <Ionicons name={icon} size={16} color="#fff" />
            </View>
            <View style={styles.pinTip} />
          </View>
        </Marker>
      </MapView>
      <Pressable onPress={() => openDirections(lat, lng)} style={({ pressed }) => [styles.directions, { bottom: bottomInset }, pressed && { opacity: 0.85 }]}>
        <Ionicons name="navigate" size={15} color="#fff" />
        <Text variant="label" color="#fff">Directions</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  pinWrap: { alignItems: 'center' },
  pin: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff', ...shadowLg,
  },
  pinTip: {
    width: 0, height: 0, marginTop: -2, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff',
  },
  directions: {
    position: 'absolute', right: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, height: 36, borderRadius: radius.pill, backgroundColor: colors.primaryDark, ...shadowLg,
  },
});
