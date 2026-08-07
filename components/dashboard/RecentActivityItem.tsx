import { StyleSheet, Text, View } from 'react-native';
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
    borderBottomColor: '#ECE2D0',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  timePill: {
    minWidth: 58,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#EFE4CF',
    marginRight: 12,
  },
  time: {
    color: '#5A4A32',
    fontSize: 13,
    fontWeight: '800',
  },
  body: {
    flex: 1,
  },
  title: {
    color: '#242016',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: '#6B6254',
    fontSize: 13,
    lineHeight: 18,
  },
});
