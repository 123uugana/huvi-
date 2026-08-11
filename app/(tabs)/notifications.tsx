import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/constants/theme';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.title}>Мэдэгдэл</Text>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Мэдэгдлийн tab бэлэн</Text>
        <Text style={styles.panelText}>
          Push notification бүртгэл болон жагсаалт Phase 14 дээр орно.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 22,
  },
  panel: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  panelText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
});
