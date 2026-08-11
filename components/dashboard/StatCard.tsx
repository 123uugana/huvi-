import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';

type StatCardProps = {
  label: string;
  value: string | number;
  tone?: 'default' | 'warning';
};

export function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  return (
    <View style={[styles.card, tone === 'warning' ? styles.warning : undefined]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 106,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#14213B',
    padding: 14,
    justifyContent: 'space-between',
  },
  warning: {
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  value: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
});
