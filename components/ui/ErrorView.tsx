import { StyleSheet, Text, View } from 'react-native';
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2D8C4',
    backgroundColor: '#FFFDF7',
    padding: 18,
    gap: 12,
  },
  title: {
    color: '#242016',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  text: {
    color: '#655C4D',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
