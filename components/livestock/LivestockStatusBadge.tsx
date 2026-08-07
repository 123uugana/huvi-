import { StyleSheet, Text, View } from 'react-native';
import type { LivestockStatus } from '@/types/livestock';
import { formatStatus } from '@/utils/livestockLabels';

type LivestockStatusBadgeProps = {
  status: LivestockStatus;
};

export function LivestockStatusBadge({ status }: LivestockStatusBadgeProps) {
  return (
    <View style={[styles.badge, status === 'MISSING' ? styles.warning : undefined]}>
      <Text style={styles.text}>{formatStatus(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#E9F0DF',
  },
  warning: {
    backgroundColor: '#F8E6D7',
  },
  text: {
    color: '#4F5038',
    fontSize: 12,
    fontWeight: '800',
  },
});
