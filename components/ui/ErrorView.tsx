import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { AppButton } from './AppButton';

type ErrorViewProps = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorView({
  message = 'Сервертэй холбогдож чадсангүй.',
  onRetry,
}: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Сервертэй холбогдож чадсангүй.</Text>
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <AppButton onPress={onRetry} title="Дахин оролдох" variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  text: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
