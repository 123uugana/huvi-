import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorView } from '@/components/ui/ErrorView';
import { LoadingView } from '@/components/ui/LoadingView';
import { colors, radius } from '@/constants/theme';
import { getLivestockScans } from '@/services/livestock.api';
import { formatDateTime, formatTime } from '@/utils/formatDate';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { formatDirection } from '@/utils/livestockLabels';

export default function LivestockScansScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const livestockId = Array.isArray(id) ? id[0] : id;
  const scansQuery = useQuery({
    queryKey: ['livestock', livestockId, 'scans'],
    queryFn: () => getLivestockScans(livestockId),
    enabled: Boolean(livestockId),
  });
  const scans = scansQuery.data?.data ?? [];

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingBottom: insets.bottom + 28 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={scansQuery.isRefetching}
          tintColor={colors.primary}
          onRefresh={scansQuery.refetch}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>RFID мэдээлэл</Text>
      <Text style={styles.title}>RFID түүх</Text>
      <Text style={styles.description}>
        RFID нь зөвхөн шошго хэзээ, аль уншигчаар уншигдсаныг харуулна.
      </Text>

      {scansQuery.isLoading ? (
        <LoadingView />
      ) : scansQuery.isError ? (
        <ErrorView
          message={getErrorMessage(scansQuery.error)}
          onRetry={() => scansQuery.refetch()}
        />
      ) : scans.length === 0 ? (
        <EmptyState message="Одоогоор RFID уншилтын түүх алга." />
      ) : (
        <View style={styles.list}>
          {scans.map((scan) => (
            <View key={scan.id} style={styles.scanRow}>
              <View style={styles.timePill}>
                <Text style={styles.time}>{formatTime(scan.scannedAt)}</Text>
              </View>
              <View style={styles.scanBody}>
                <Text style={styles.reader}>{scan.reader.name}</Text>
                <Text style={styles.meta}>
                  {formatDirection(scan.direction) ?? 'Чиглэл бүртгэгдээгүй'} ·{' '}
                  {formatDateTime(scan.scannedAt)}
                </Text>
                <Text style={styles.epc}>{scan.epc}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 8,
  },
  description: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  list: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  scanRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    paddingVertical: 14,
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
  scanBody: {
    flex: 1,
  },
  reader: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  epc: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '700',
  },
});
