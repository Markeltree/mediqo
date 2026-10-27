import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';
import { Text } from './Text';

export function EmptyState({ icon, title, message, action }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text variant="h3" center>{title}</Text>
      {message && <Text variant="small" color={colors.muted} center style={{ marginTop: 6, maxWidth: 280 }}>{message}</Text>}
      {action && <View style={{ marginTop: spacing.md }}>{action}</View>}
    </View>
  );
}
