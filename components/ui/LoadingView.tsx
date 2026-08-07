import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type LoadingViewProps = {
  message?: string;
};

export function LoadingView({
  message = 'Мэдээлэл ачаалж байна...',
}: LoadingViewProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color="#6E5B3E" />
      <Text style={styles.text}>{message}</Text>
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
  text: {
    color: '#655C4D',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
