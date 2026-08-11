import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { AppProviders } from '@/providers/AppProviders';
import { useAuthStore } from '@/store/auth.store';
import { colors } from '@/constants/theme';

function RootNavigator() {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  useNotifications();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="livestock" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
