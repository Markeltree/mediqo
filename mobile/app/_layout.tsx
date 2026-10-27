import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { AreaProvider } from '../src/context/AreaContext';
import { FeedbackHost } from '../src/components/ui/Feedback';
import { colors } from '../src/theme';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  // A font that fails to load falls back to the system font rather than blocking the app
  const loading = authLoading || (!fontsLoaded && !fontError);
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;
    const inAuthScreen = segments[0] === 'login' || segments[0] === 'register';
    if (!user && !inAuthScreen) router.replace('/login');
    if (user && inAuthScreen) router.replace('/(tabs)');
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AreaProvider>
            <StatusBar style="dark" />
            <AuthGate>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="login" options={{ animation: 'fade' }} />
                <Stack.Screen name="register" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="doctor/[id]" options={{ presentation: 'card' }} />
                <Stack.Screen name="facility/[id]" options={{ presentation: 'card' }} />
                <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
                <Stack.Screen name="area" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
              </Stack>
            </AuthGate>
            <FeedbackHost />
          </AreaProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
