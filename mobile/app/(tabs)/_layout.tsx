import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadowLg } from '../../src/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const icon = (focused: IconName, idle: IconName) =>
  ({ color, focused: isFocused }: { color: string; focused: boolean }) => (
    <View
      style={{
        width: 52, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
        backgroundColor: isFocused ? colors.primarySoft : 'transparent',
      }}
    >
      <Ionicons name={isFocused ? focused : idle} size={21} color={color} />
    </View>
  );

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
          ...shadowLg,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.semibold, marginTop: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="appointments" options={{ title: 'Visits', tabBarIcon: icon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="assistant" options={{ title: 'Assistant', tabBarIcon: icon('sparkles', 'sparkles-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
