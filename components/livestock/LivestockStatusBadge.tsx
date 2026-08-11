import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import type { LivestockStatus } from '@/types/livestock';
import { formatStatus } from '@/utils/livestockLabels';

type LivestockStatusBadgeProps = {
  status: LivestockStatus;
};

export function LivestockStatusBadge({ status }: LivestockStatusBadgeProps) {
  return (
    <View style={[styles.badge, status === 'MISSING' ? styles.warning : undefined]}>
      <Text style={[styles.text, status === 'MISSING' ? styles.warningText : undefined]}>
        {formatStatus(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    backgroundColor: colors.successSoft,
  },
  warning: {
    backgroundColor: colors.dangerSoft,
  },
  text: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
  },
  warningText: {
    color: colors.danger,
  },
});
