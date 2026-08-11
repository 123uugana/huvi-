import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';

export default function LivestockLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isProfileComplete = useAuthStore((state) => state.isProfileComplete);

  if (isInitializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isProfileComplete) {
    return <Redirect href="/(auth)/profile-setup" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '800',
        },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="create" options={{ title: 'Мал бүртгэх' }} />
      <Stack.Screen name="[id]" options={{ title: 'Малын мэдээлэл' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Засах' }} />
      <Stack.Screen name="[id]/scans" options={{ title: 'RFID түүх' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
