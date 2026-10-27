import React, { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '../../src/lib/api';
import { useArea } from '../../src/context/AreaContext';
import { FadeInView } from '../../src/components/FadeInView';
import { Avatar, Text, feedback } from '../../src/components/ui';
import { colors, fonts, gradients, radius, shadow, spacing } from '../../src/theme';
import type { Practice } from '../../src/lib/types';

type Msg = { id: string; role: 'user' | 'assistant'; content: string; error?: boolean };
type Triage = { suggestion: { specialty: string; urgency: string; reason: string }; doctors: Practice[] };

const GREETING: Msg = {
  id: 'hello',
  role: 'assistant',
  content: "Hi, I'm the Mediqo assistant. Tell me how you're feeling and I'll help you understand your symptoms and find the right specialist.",
};

const STARTERS = ['I have a headache and fever', 'Skin rash that itches', 'Chest pain when walking', 'My child has a cough'];

const URGENCY: Record<string, { label: string; fg: string; bg: string }> = {
  low: { label: 'Low urgency', fg: colors.success, bg: colors.successSoft },
  medium: { label: 'See a doctor soon', fg: colors.warning, bg: colors.warningSoft },
  high: { label: 'Urgent', fg: colors.danger, bg: colors.dangerSoft },
};

// Replies come back as light Markdown: render **bold**, "- " bullets and "#" headings instead of showing the symbols
function Inline({ text, color }: { text: string; color: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text color={color}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <Text key={i} variant="bodyMedium" color={colors.ink} style={{ fontFamily: fonts.bold }}>{p.slice(2, -2)}</Text>
          : p
      )}
    </Text>
  );
}

function Formatted({ text, color = colors.ink }: { text: string; color?: string }) {
  const lines = text.split('\n');
  return (
    <View style={{ gap: 4 }}>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <View key={i} style={{ height: 4 }} />;
        const heading = line.match(/^#{1,6}\s+(.*)$/);
        if (heading) return <Text key={i} variant="h3" color={color}>{heading[1].replace(/\*\*/g, '')}</Text>;
        const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
        if (bullet) {
          const marker = /^\s*\d/.test(line) ? line.trim().match(/^\d+/)![0] + '.' : '•';
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 8, paddingLeft: 2 }}>
              <Text color={colors.primary} style={{ fontFamily: fonts.bold, minWidth: marker === '•' ? 8 : 18 }}>{marker}</Text>
              <View style={{ flex: 1 }}><Inline text={bullet[1]} color={color} /></View>
            </View>
          );
        }
        return <Inline key={i} text={line} color={color} />;
      })}
    </View>
  );
}

function BotMark({ size = 30 }: { size?: number }) {
  return (
    <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="sparkles" size={size * 0.5} color="#fff" />
    </LinearGradient>
  );
}

export default function AssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const { area } = useArea();
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [triage, setTriage] = useState<Triage | null>(null);

  const hasUserMessage = messages.some((m) => m.role === 'user');
  const scrollToEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput('');
    const next: Msg[] = [...messages, { id: String(Date.now()), role: 'user', content }];
    setMessages(next);
    setBusy(true);
    scrollToEnd();
    try {
      // The greeting is UI-only and failed replies were never real turns; Anthropic requires the conversation to start with a user turn
      const history = next
        .filter((m) => m.id !== 'hello' && !m.error)
        .map(({ role, content }) => ({ role, content }))
        .slice(-20);
      const { data } = await api.post('/ai/chat', { messages: history });
      setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((m) => [...m, { id: `e${Date.now()}`, role: 'assistant', error: true, content: "I couldn't reach the assistant just now. Check your connection and try again." }]);
    } finally {
      setBusy(false);
      scrollToEnd();
    }
  };

  const findSpecialist = async () => {
    const symptoms = messages.filter((m) => m.role === 'user').map((m) => m.content).join('. ');
    if (!symptoms || busy) return;
    setBusy(true);
    try {
      const { data } = await api.post('/ai/triage', {
        symptoms,
        lat: area?.coords.latitude,
        lng: area?.coords.longitude,
      });
      setTriage(data);
      scrollToEnd();
    } catch {
      feedback.toast({ tone: 'error', title: 'Could not suggest a specialist', message: 'Please try again in a moment.' });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setMessages([GREETING]);
    setTriage(null);
    setInput('');
  };

  const urgency = triage ? URGENCY[triage.suggestion.urgency] ?? URGENCY.medium : null;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BotMark size={42} />
        <View style={{ flex: 1 }}>
          <Text variant="h2">Mediqo Assistant</Text>
          <View style={styles.statusRow}>
            <View style={styles.dot} />
            <Text variant="small" color={colors.muted}>Online · not a substitute for a doctor</Text>
          </View>
        </View>
        {hasUserMessage && (
          <Pressable onPress={reset} style={styles.iconBtn} hitSlop={8} accessibilityLabel="Start a new chat">
            <Ionicons name="create-outline" size={20} color={colors.ink} />
          </Pressable>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.lg }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) =>
          item.role === 'user' ? (
            <Animated.View entering={FadeInDown.duration(250)} style={[styles.bubble, styles.userBubble]}>
              <Text color="#fff">{item.content}</Text>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(250)} style={styles.botRow}>
              <BotMark />
              <View style={[styles.bubble, styles.botBubble, item.error && styles.errorBubble]}>
                {item.error && <Ionicons name="cloud-offline-outline" size={16} color={colors.danger} style={{ marginBottom: 4 }} />}
                {item.error ? <Text color={colors.danger}>{item.content}</Text> : <Formatted text={item.content} />}
              </View>
            </Animated.View>
          )
        }
        ListFooterComponent={
          <>
            {busy && (
              <View style={styles.botRow}>
                <BotMark />
                <View style={[styles.bubble, styles.botBubble, styles.typing]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text variant="small" color={colors.muted}>Thinking…</Text>
                </View>
              </View>
            )}

            {!hasUserMessage && (
              <FadeInView delay={150} style={{ marginTop: spacing.md }}>
                <Text variant="label" color={colors.muted} style={{ marginBottom: spacing.sm }}>Try asking about</Text>
                <View style={styles.starters}>
                  {STARTERS.map((s) => (
                    <Pressable key={s} onPress={() => send(s)} style={({ pressed }) => [styles.starter, pressed && { opacity: 0.7 }]}>
                      <Text variant="smallMedium" color={colors.inkSoft}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </FadeInView>
            )}

            {triage && urgency && (
              <FadeInView style={styles.triageCard}>
                <View style={styles.triageHead}>
                  <View style={styles.triageIcon}>
                    <Ionicons name="medkit" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color={colors.muted} style={{ textTransform: 'uppercase' }}>Suggested specialist</Text>
                    <Text variant="h2">{triage.suggestion.specialty}</Text>
                  </View>
                </View>
                <View style={[styles.urgency, { backgroundColor: urgency.bg }]}>
                  <Text variant="caption" color={urgency.fg}>{urgency.label}</Text>
                </View>
                <Text variant="small" color={colors.inkSoft} style={{ marginTop: spacing.sm }}>{triage.suggestion.reason}</Text>

                {triage.doctors.length > 0 && (
                  <Text variant="label" style={{ marginTop: spacing.md }}>Doctors near you</Text>
                )}
                {triage.doctors.map((d) => (
                  <Pressable key={d._id} style={({ pressed }) => [styles.triageDoc, pressed && { opacity: 0.7 }]} onPress={() => router.push(`/doctor/${d._id}`)}>
                    <Avatar name={d.name} size={40} rounded="square" />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" numberOfLines={1}>{d.name}</Text>
                      <Text variant="small" color={colors.muted} numberOfLines={1}>
                        {d.facility.name}{d.distanceKm !== undefined ? ` · ${d.distanceKm} km` : ''}
                      </Text>
                    </View>
                    <Text variant="label" color={colors.primaryDark}>Rs {d.fee.toLocaleString()}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.faint} />
                  </Pressable>
                ))}

                <Pressable style={styles.triageBtn} onPress={() => router.push('/(tabs)')}>
                  <Text variant="label" color={colors.primaryDark}>
                    {triage.doctors.length === 0 ? 'No match nearby · browse all doctors' : 'Browse all doctors'}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primaryDark} />
                </Pressable>
              </FadeInView>
            )}
          </>
        }
      />

      <View style={styles.composer}>
        {hasUserMessage && !triage && (
          <Pressable onPress={findSpecialist} style={[styles.suggest, busy && { opacity: 0.5 }]} disabled={busy}>
            <Ionicons name="medkit-outline" size={15} color={colors.primaryDark} />
            <Text variant="label" color={colors.primaryDark}>Suggest a specialist</Text>
          </Pressable>
        )}
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Describe how you feel…"
            placeholderTextColor={colors.faint}
            style={styles.input}
            multiline
          />
          <Pressable
            onPress={() => send()}
            style={[styles.send, (!input.trim() || busy) && styles.sendDisabled]}
            disabled={!input.trim() || busy}
            accessibilityLabel="Send"
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingHorizontal: spacing.md, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },

  botRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.sm + 2, maxWidth: '88%' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg },
  userBubble: { alignSelf: 'flex-end', maxWidth: '80%', backgroundColor: colors.primary, borderBottomRightRadius: 6, marginBottom: spacing.sm + 2 },
  botBubble: { flexShrink: 1, backgroundColor: colors.surface, borderBottomLeftRadius: 6, ...shadow },
  errorBubble: { backgroundColor: colors.dangerSoft, shadowOpacity: 0, elevation: 0 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  starters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  starter: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },

  triageCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.sm, ...shadow },
  triageHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  triageIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  urgency: { alignSelf: 'flex-start', marginTop: spacing.sm + 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  triageDoc: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, marginTop: spacing.sm, padding: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.bg },
  triageBtn: { flexDirection: 'row', gap: 6, marginTop: spacing.md, height: 46, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },

  composer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm + 2, paddingBottom: spacing.sm + 4, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, gap: spacing.sm + 2 },
  suggest: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, height: 34, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: { flex: 1, maxHeight: 120, minHeight: 46, backgroundColor: colors.bg, borderRadius: 23, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, fontSize: 15, fontFamily: fonts.regular, color: colors.ink },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { backgroundColor: colors.faint },
});
