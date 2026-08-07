import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setUnauthorizedHandler } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';

export function AppProviders({ children }: PropsWithChildren) {
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
    [],
  );

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await logout();
      queryClient.clear();
    });
  }, [logout, queryClient]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
}
