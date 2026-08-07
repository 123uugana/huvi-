import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cleanupNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/store/auth.store';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  async function handleLogout() {
    await cleanupNotifications();
    await logout();
    queryClient.clear();
    router.replace('/(auth)/login');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.title}>Профайл</Text>
      <View style={styles.panel}>
        <Text style={styles.label}>Нэр</Text>
        <Text style={styles.value}>{user?.name ?? '-'}</Text>
        <Text style={styles.label}>Утасны дугаар</Text>
        <Text style={styles.value}>{user?.phoneNumber ?? '-'}</Text>
        <Text style={styles.label}>Эрх</Text>
        <Text style={styles.value}>{user?.role ?? '-'}</Text>
      </View>
      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Гарах</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F3EA',
    paddingHorizontal: 20,
  },
  title: {
    color: '#242016',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 22,
  },
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2D8C4',
    backgroundColor: '#FFFDF7',
    padding: 18,
    marginBottom: 16,
  },
  label: {
    color: '#746957',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  value: {
    color: '#242016',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
  },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#6E5B3E',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
