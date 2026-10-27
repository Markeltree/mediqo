import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../src/context/AuthContext';
import { Button } from '../src/components/Button';
import { FadeInView } from '../src/components/FadeInView';
import { Input, Text } from '../src/components/ui';
import { colors, radius, shadow, spacing } from '../src/theme';

type Role = 'patient' | 'doctor';
type Field = 'name' | 'email' | 'phone' | 'password';

const ROLES: { key: Role; title: string; body: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'patient', title: 'Patient', body: 'Find and book doctors', icon: 'person' },
  { key: 'doctor', title: 'Doctor', body: 'Manage your visits', icon: 'medkit' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 0–4: length, mixed case, digit, symbol
function strength(pw: string) {
  if (!pw) return 0;
  return [pw.length >= 8, /[a-z]/.test(pw) && /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
}
const STRENGTH = [
  { label: '', color: colors.line },
  { label: 'Weak', color: colors.danger },
  { label: 'Fair', color: colors.warning },
  { label: 'Good', color: colors.primary },
  { label: 'Strong', color: colors.success },
];

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<Record<Field, string>>({ name: '', email: '', phone: '', password: '' });
  const [role, setRole] = useState<Role>('patient');
  const [errors, setErrors] = useState<Partial<Record<Field | 'form', string>>>({});
  const [busy, setBusy] = useState(false);
  const score = strength(form.password);

  const set = (k: Field) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined, form: undefined }));
  };

  const submit = async () => {
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = 'Enter your full name';
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address';
    if (form.phone && !/^\+?[\d\s-]{10,15}$/.test(form.phone)) next.phone = 'Enter a valid phone number';
    if (form.password.length < 8) next.password = 'Use at least 8 characters';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        role,
      });
    } catch (e: any) {
      setErrors({ form: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </Pressable>

        <FadeInView>
          <Text variant="h1" style={{ marginTop: spacing.lg }}>Create your account</Text>
          <Text variant="small" color={colors.muted} style={{ marginTop: 4 }}>It takes less than a minute.</Text>
        </FadeInView>

        <FadeInView delay={80} style={styles.roleRow}>
          {ROLES.map((r) => {
            const active = role === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => { Haptics.selectionAsync().catch(() => undefined); setRole(r.key); }}
                style={[styles.roleCard, active && styles.roleCardActive]}
              >
                <View style={[styles.roleIcon, active && { backgroundColor: colors.primary }]}>
                  <Ionicons name={r.icon} size={18} color={active ? '#fff' : colors.primary} />
                </View>
                <Text variant="h3" style={{ marginTop: spacing.sm }}>{r.title}</Text>
                <Text variant="small" color={colors.muted}>{r.body}</Text>
                {active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={styles.roleCheck} />}
              </Pressable>
            );
          })}
        </FadeInView>

        <FadeInView delay={160} style={{ marginTop: spacing.lg }}>
          {errors.form && (
            <View style={styles.formError}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text variant="smallMedium" color={colors.danger} style={{ flex: 1 }}>{errors.form}</Text>
            </View>
          )}

          <Input label="Full name" icon="person-outline" placeholder={role === 'doctor' ? 'Dr. Ayesha Khan' : 'Ali Raza'} autoComplete="name" value={form.name} onChangeText={set('name')} error={errors.name} />
          <Input label="Email" icon="mail-outline" placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={form.email} onChangeText={set('email')} error={errors.email} />
          <Input label="Phone (optional)" icon="call-outline" placeholder="+1 555 123 4567" keyboardType="phone-pad" autoComplete="tel" value={form.phone} onChangeText={set('phone')} error={errors.phone} hint="Used for appointment reminders" />
          <Input label="Password" icon="lock-closed-outline" placeholder="At least 8 characters" secureTextEntry value={form.password} onChangeText={set('password')} error={errors.password} />

          {form.password.length > 0 && (
            <View style={styles.meterRow}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={[styles.meterBar, { backgroundColor: i <= score ? STRENGTH[score].color : colors.line }]} />
              ))}
              <Text variant="caption" color={STRENGTH[score].color} style={{ width: 44, textAlign: 'right' }}>{STRENGTH[score].label}</Text>
            </View>
          )}

          {role === 'doctor' && (
            <View style={styles.note}>
              <Ionicons name="information-circle" size={18} color={colors.accent} />
              <Text variant="small" color={colors.inkSoft} style={{ flex: 1 }}>
                Patients will see your profile once the Mediqo team verifies your medical registration.
              </Text>
            </View>
          )}

          <Button title="Create account" onPress={submit} loading={busy} style={{ marginTop: spacing.md }} />

          <Text variant="caption" color={colors.muted} center style={{ marginTop: spacing.md }}>
            By continuing you agree to Mediqo's Terms and Privacy Policy.
          </Text>

          <View style={styles.footer}>
            <Text variant="small" color={colors.muted}>Already have an account?</Text>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text variant="label" color={colors.primary}>Sign in</Text>
            </Pressable>
          </View>
        </FadeInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  roleCard: { flex: 1, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  roleCardActive: { borderColor: colors.primary, backgroundColor: '#F7FCFB' },
  roleIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  roleCheck: { position: 'absolute', top: 12, right: 12 },
  formError: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: 12, marginBottom: spacing.md },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6, marginBottom: spacing.md },
  meterBar: { flex: 1, height: 4, borderRadius: 2 },
  note: { flexDirection: 'row', gap: 8, backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: spacing.lg },
});
