import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

type AppHeaderProps = {
  title?: string;
  showBack?: boolean;
  showSettings?: boolean;
};

export function AppHeader({
  title = 'Хэнц Хурга',
  showBack = false,
  showSettings = true,
}: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        disabled={!showBack}
        onPress={() => router.back()}
        style={styles.iconButton}
      >
        {showBack ? (
          <Ionicons color={colors.textMuted} name="arrow-back" size={22} />
        ) : null}
      </Pressable>
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={!showSettings}
        onPress={() => router.push('/(tabs)/profile')}
        style={styles.iconButton}
      >
        {showSettings ? (
          <Ionicons color={colors.textMuted} name="settings-outline" size={21} />
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    marginHorizontal: -20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
    textAlign: 'center',
  },
});
