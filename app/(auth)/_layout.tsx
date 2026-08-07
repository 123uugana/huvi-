import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuthStore } from '@/store/auth.store';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isProfileComplete = useAuthStore((state) => state.isProfileComplete);
  const segments = useSegments();
  const currentRoute = segments.at(-1);

  if (isInitializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#6E5B3E" />
      </View>
    );
  }

  if (isAuthenticated) {
    if (!isProfileComplete && currentRoute !== 'profile-setup') {
      return <Redirect href="/(auth)/profile-setup" />;
    }

    if (!isProfileComplete) {
      return (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#F6F3EA' },
          }}
        />
      );
    }

    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F6F3EA' },
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F3EA',
  },
});
