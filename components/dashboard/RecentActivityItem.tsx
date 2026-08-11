import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import type { DashboardRecentScan } from '@/types/dashboard';
import { formatDateTime, formatTime } from '@/utils/formatDate';

type RecentActivityItemProps = {
  scan: DashboardRecentScan;
};

export function RecentActivityItem({ scan }: RecentActivityItemProps) {
  return (
    <View style={styles.row}>
      <View style={styles.timePill}>
        <Text style={styles.time}>{formatTime(scan.scannedAt)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>
          {scan.livestock.earNumber}
          {scan.livestock.name ? ` · ${scan.livestock.name}` : ''}
        </Text>
        <Text style={styles.subtitle}>
          Сүүлд RFID уншигдсан: {formatDateTime(scan.scannedAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  timePill: {
    minWidth: 58,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSoft,
    marginRight: 12,
  },
  time: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  body: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
