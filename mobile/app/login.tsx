import React, { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { Button } from '../src/components/Button';
import { FadeInView } from '../src/components/FadeInView';
import { Input, Logo, Text } from '../src/components/ui';
import { colors, gradients, radius, spacing } from '../src/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    setStatusBarStyle('light');
    return () => setStatusBarStyle('dark');
  }, []));

  const submit = async () => {
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setErrors({ form: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
          <View style={[styles.orb, { width: 220, height: 220, top: -60, right: -70 }]} />
          <View style={[styles.orb, { width: 140, height: 140, bottom: 10, left: -50 }]} />
          <FadeInView>
            <Logo light size={40} />
            <Text variant="display" color="#fff" style={{ marginTop: spacing.xl }}>Your health,{'\n'}one tap away.</Text>
            <Text variant="body" color="rgba(255,255,255,0.82)" style={{ marginTop: spacing.sm }}>
              Verified doctors near you. Book in seconds.
            </Text>
            <View style={styles.trustRow}>
              <Trust icon="shield-checkmark" label="Verified doctors" />
              <Trust icon="time" label="Instant booking" />
            </View>
          </FadeInView>
        </LinearGradient>

        <FadeInView delay={120} style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text variant="h1">Welcome back</Text>
          <Text variant="small" color={colors.muted} style={{ marginTop: 4, marginBottom: spacing.lg }}>Sign in to manage your visits.</Text>

          {errors.form && (
            <View style={styles.formError}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text variant="smallMedium" color={colors.danger} style={{ flex: 1 }}>{errors.form}</Text>
            </View>
          )}

          <Input
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
            value={email}
            onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined, form: undefined })); }}
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={errors.email}
          />
          <Input
            ref={passwordRef}
            label="Password"
            icon="lock-closed-outline"
            placeholder="Your password"
            secureTextEntry
            autoComplete="password"
            returnKeyType="go"
            value={password}
            onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined, form: undefined })); }}
            onSubmitEditing={submit}
            error={errors.password}
          />

          <Button title="Sign in" onPress={submit} loading={busy} style={{ marginTop: spacing.sm }} />

          <View style={styles.footer}>
            <Text variant="small" color={colors.muted}>New to Mediqo?</Text>
            <Pressable onPress={() => router.push('/register')} hitSlop={8}>
              <Text variant="label" color={colors.primary}>Create an account</Text>
            </Pressable>
          </View>
        </FadeInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Trust({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.trust}>
      <Ionicons name={icon} size={14} color="#fff" />
      <Text variant="caption" color="#fff">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  hero: { paddingHorizontal: spacing.lg, paddingBottom: 56, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  trustRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.16)' },
  sheet: { flex: 1, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, marginTop: -28, padding: spacing.lg },
  formError: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: 12, marginBottom: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: spacing.lg },
});
