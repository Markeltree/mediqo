import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadowLg, spacing } from '../../theme';
import { Text } from './Text';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
export type Tone = 'success' | 'error' | 'warning' | 'info';

export type DialogAction = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };
type DialogOptions = { title: string; message?: string; tone?: Tone; icon?: IconName; actions?: DialogAction[] };
type ToastOptions = { title: string; message?: string; tone?: Tone; icon?: IconName; duration?: number; onPress?: () => void };

const TONES: Record<Tone, { fg: string; bg: string; icon: IconName; haptic: Haptics.NotificationFeedbackType }> = {
  success: { fg: colors.success, bg: colors.successSoft, icon: 'checkmark-circle', haptic: Haptics.NotificationFeedbackType.Success },
  error: { fg: colors.danger, bg: colors.dangerSoft, icon: 'alert-circle', haptic: Haptics.NotificationFeedbackType.Error },
  warning: { fg: colors.warning, bg: colors.warningSoft, icon: 'warning', haptic: Haptics.NotificationFeedbackType.Warning },
  info: { fg: colors.primary, bg: colors.primarySoft, icon: 'information-circle', haptic: Haptics.NotificationFeedbackType.Success },
};

type Host = { dialog: (o: DialogOptions) => void; toast: (o: ToastOptions) => void };
let host: Host | null = null;

/**
 * Branded replacements for Alert.alert. Works from anywhere (screens, contexts, listeners)
 * once <FeedbackHost /> is mounted in the root layout.
 */
export const feedback = {
  alert(title: string, message?: string, opts: Omit<DialogOptions, 'title' | 'message'> = {}) {
    host?.dialog({ title, message, ...opts });
  },
  /** Resolves true when the confirm button is pressed. */
  confirm(o: { title: string; message?: string; confirmText?: string; cancelText?: string; destructive?: boolean; tone?: Tone; icon?: IconName }) {
    return new Promise<boolean>((resolve) => {
      if (!host) return resolve(false);
      host.dialog({
        title: o.title,
        message: o.message,
        tone: o.tone ?? (o.destructive ? 'error' : 'info'),
        icon: o.icon ?? (o.destructive ? 'trash-outline' : 'help-circle'),
        actions: [
          { text: o.cancelText ?? 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: o.confirmText ?? 'Confirm', style: o.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
        ],
      });
    });
  },
  toast(o: ToastOptions) {
    host?.toast(o);
  },
};

export function FeedbackHost() {
  const [dialogs, setDialogs] = useState<(DialogOptions & { id: number })[]>([]);
  const nextId = useRef(0);
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null);

  useEffect(() => {
    host = {
      dialog: (o) => setDialogs((q) => [...q, { ...o, id: nextId.current++ }]),
      toast: (o) => setToast({ ...o, key: Date.now() }),
    };
    return () => {
      host = null;
    };
  }, []);

  const closeDialog = useCallback(() => setDialogs((q) => q.slice(1)), []);

  return (
    <>
      {toast && <Toast key={toast.key} {...toast} onHide={() => setToast(null)} />}
      {dialogs[0] && <Dialog key={dialogs[0].id} {...dialogs[0]} onClosed={closeDialog} />}
    </>
  );
}

function Dialog({ title, message, tone = 'info', icon, actions, onClosed }: DialogOptions & { onClosed: () => void }) {
  const t = TONES[tone];
  const buttons: DialogAction[] = actions?.length ? actions : [{ text: 'OK' }];
  const cancel = buttons.find((b) => b.style === 'cancel');
  const progress = useSharedValue(0);
  const closing = useRef(false);

  useEffect(() => {
    progress.value = withSpring(1, { damping: 16, stiffness: 180 });
    Haptics.notificationAsync(t.haptic).catch(() => undefined);
  }, [progress, t.haptic]);

  const close = useCallback(
    (action?: DialogAction) => {
      if (closing.current) return;
      closing.current = true;
      progress.value = withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(onClosed)();
      });
      // Run after the card starts leaving so a follow-up dialog queues behind this one
      setTimeout(() => action?.onPress?.(), 0);
    },
    [onClosed, progress]
  );

  // Android back acts like the cancel button, or OK on single-button alerts
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close(cancel ?? (buttons.length === 1 ? buttons[0] : undefined));
      return true;
    });
    return () => sub.remove();
  }, [buttons, cancel, close]);

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }));
  const card = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 24 }, { scale: 0.88 + progress.value * 0.12 }] as const,
  }));

  const stacked = buttons.length > 2 || buttons.some((b) => b.text.length > 14);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => cancel && close(cancel)} />
      </Animated.View>
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View style={[styles.card, card]}>
          <View style={[styles.iconHalo, { backgroundColor: t.bg }]}>
            <View style={[styles.iconCore, { backgroundColor: t.fg }]}>
              <Ionicons name={icon ?? t.icon} size={28} color="#fff" />
            </View>
          </View>
          <Text variant="h2" center>{title}</Text>
          {!!message && <Text variant="body" color={colors.muted} center style={{ marginTop: 6 }}>{message}</Text>}
          <View style={[styles.actions, stacked && { flexDirection: 'column-reverse' }]}>
            {buttons.map((b) => {
              const isCancel = b.style === 'cancel';
              const bg = isCancel ? colors.surfaceAlt : b.style === 'destructive' ? colors.danger : tone === 'error' ? colors.ink : t.fg;
              return (
                <Pressable
                  key={b.text}
                  onPress={() => close(b)}
                  style={({ pressed }) => [styles.btn, !stacked && { flex: 1 }, { backgroundColor: bg }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                >
                  <Text variant="label" color={isCancel ? colors.inkSoft : '#fff'} style={{ fontSize: 15 }}>{b.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

function Toast({ title, message, tone = 'info', icon, duration = 3500, onPress, onHide }: ToastOptions & { onHide: () => void }) {
  const insets = useSafeAreaInsets();
  const t = TONES[tone];
  const y = useSharedValue(-160);
  const drag = useSharedValue(0);

  const hide = useCallback(() => {
    y.value = withTiming(-160, { duration: 220 }, (done) => {
      if (done) runOnJS(onHide)();
    });
  }, [onHide, y]);

  useEffect(() => {
    y.value = withSpring(0, { damping: 18, stiffness: 200 });
    Haptics.notificationAsync(t.haptic).catch(() => undefined);
    const timer = setTimeout(hide, duration);
    return () => clearTimeout(timer);
  }, [duration, hide, t.haptic, y]);

  // Swipe up to dismiss
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      drag.value = Math.min(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY < -30) runOnJS(hide)();
      drag.value = withSpring(0);
    });

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value + drag.value }] }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.toastWrap, { top: insets.top + spacing.sm }, style]}>
        <Pressable
          onPress={() => {
            onPress?.();
            hide();
          }}
          style={styles.toast}
        >
          <View style={[styles.toastAccent, { backgroundColor: t.fg }]} />
          <View style={[styles.toastIcon, { backgroundColor: t.bg }]}>
            <Ionicons name={icon ?? t.icon} size={20} color={t.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label" numberOfLines={1}>{title}</Text>
            {!!message && <Text variant="small" color={colors.muted} numberOfLines={2}>{message}</Text>}
          </View>
          {onPress && <Ionicons name="chevron-forward" size={18} color={colors.faint} />}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11, 28, 44, 0.55)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md + 4, alignItems: 'center', ...shadowLg,
  },
  iconHalo: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  iconCore: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: spacing.lg },
  btn: { height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  toastWrap: { position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 1000 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg,
    paddingVertical: 12, paddingRight: spacing.md, paddingLeft: spacing.md + 4, ...shadowLg,
  },
  toastAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg },
  toastIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
