import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../../theme';
import { Text } from './Text';

type Props = TextInputProps & {
  label?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  error?: string;
  hint?: string;
};

/** Labelled text field with a leading icon, focus ring, and a show/hide toggle for passwords. */
export const Input = forwardRef<TextInput, Props>(function Input(
  { label, icon, error, hint, secureTextEntry, style, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.line;

  return (
    <View style={styles.wrap}>
      {label && <Text variant="label" color={colors.inkSoft} style={styles.label}>{label}</Text>}
      <View style={[styles.field, { borderColor }, focused && styles.focused]}>
        {icon && <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.faint} />}
        <TextInput
          ref={ref}
          {...rest}
          secureTextEntry={secureTextEntry && hidden}
          placeholderTextColor={colors.faint}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={[styles.input, style]}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {(error || hint) && (
        <Text variant="small" color={error ? colors.danger : colors.muted} style={{ marginTop: 6 }}>{error ?? hint}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { marginBottom: 8 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, paddingHorizontal: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5,
  },
  focused: { backgroundColor: '#FBFEFE' },
  input: { flex: 1, height: '100%', fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
});
