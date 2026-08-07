import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/store/auth.store';

export default function IndexScreen() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isProfileComplete = useAuthStore((state) => state.isProfileComplete);

  if (!isInitializing) {
    if (!isAuthenticated) {
      return <Redirect href="/(auth)/login" />;
    }

    if (!isProfileComplete) {
      return <Redirect href="/(auth)/profile-setup" />;
    }

    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>ХЭНЦ ХУРГА</Text>
      <ActivityIndicator color="#6E5B3E" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F3EA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  eyebrow: {
    color: '#6E5B3E',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
});
