import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';

export default function IndexScreen() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isProfileComplete = useAuthStore((state) => state.isProfileComplete);
  const user = useAuthStore((state) => state.user);

  if (!isInitializing) {
    if (!isAuthenticated) {
      return <Redirect href="/(auth)/login" />;
    }

    if (!isProfileComplete) {
      return <Redirect href="/(auth)/profile-setup" />;
    }

    return <Redirect href={user?.role === 'ADMIN' ? '/(admin)' : '/(tabs)'} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Ionicons color={colors.primary} name="paw" size={42} />
      </View>
      <Text style={styles.title}>Хэнц Хурга</Text>
      <Text style={styles.subtitle}>Таны сүрэг таны гарт</Text>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logo: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 46,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
});
