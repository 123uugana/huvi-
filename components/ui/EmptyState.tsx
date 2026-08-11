import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { AppButton } from './AppButton';

type EmptyStateProps = {
  message: string;
  actionTitle?: string;
  onAction?: () => void;
};

export function EmptyState({ message, actionTitle, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
      {actionTitle && onAction ? (
        <AppButton onPress={onAction} title={actionTitle} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 12,
  },
  text: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
});
