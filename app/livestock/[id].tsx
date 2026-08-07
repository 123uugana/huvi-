import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LivestockStatusBadge } from '@/components/livestock/LivestockStatusBadge';
import { ErrorView } from '@/components/ui/ErrorView';
import { LoadingView } from '@/components/ui/LoadingView';
import { getLivestockDetail } from '@/services/livestock.api';
import { formatDateTime } from '@/utils/formatDate';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { formatGender } from '@/utils/livestockLabels';

export default function LivestockDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const livestockId = Array.isArray(id) ? id[0] : id;
  const livestockQuery = useQuery({
    queryKey: ['livestock', livestockId],
    queryFn: () => getLivestockDetail(livestockId),
    enabled: Boolean(livestockId),
  });
  const livestock = livestockQuery.data?.data;

  if (livestockQuery.isLoading) {
    return (
      <View style={styles.stateWrap}>
        <LoadingView />
      </View>
    );
  }

  if (livestockQuery.isError || !livestock) {
    return (
      <View style={styles.stateWrap}>
        <ErrorView
          message={getErrorMessage(livestockQuery.error)}
          onRetry={() => livestockQuery.refetch()}
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingBottom: insets.bottom + 28 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={livestockQuery.isRefetching}
          tintColor="#6E5B3E"
          onRefresh={livestockQuery.refetch}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.imageWrap}>
        {livestock.imageUrl ? (
          <Image source={{ uri: livestock.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imageText}>{livestock.earNumber}</Text>
          </View>
        )}
      </View>

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Малын мэдээлэл</Text>
          <Text style={styles.title}>{livestock.earNumber}</Text>
          <Text style={styles.name}>{livestock.name || 'Нэргүй'}</Text>
        </View>
        <LivestockStatusBadge status={livestock.status} />
      </View>

      <View style={styles.actions}>
        <Link href={`/livestock/${livestock.id}/edit`} style={styles.primaryAction}>
          Засах
        </Link>
        <Link href={`/livestock/${livestock.id}/scans`} style={styles.secondaryAction}>
          RFID түүх
        </Link>
      </View>

      <View style={styles.section}>
        <InfoRow label="Хүйс" value={formatGender(livestock.gender)} />
        <InfoRow
          label="Төрсөн он"
          value={livestock.birthYear ? String(livestock.birthYear) : 'Тодорхойгүй'}
        />
        <InfoRow label="Өнгө" value={livestock.color || 'Тодорхойгүй'} />
        <InfoRow
          label="Им / онцлог"
          value={livestock.markDescription || 'Тодорхойгүй'}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.rfidTitleRow}>
          <Ionicons color="#6E5B3E" name="radio-outline" size={20} />
          <Text style={styles.sectionTitle}>RFID мэдээлэл</Text>
        </View>
        <InfoRow
          label="RFID EPC"
          value={livestock.rfidTag?.epc || 'Бүртгээгүй'}
        />
        <InfoRow
          label="Сүүлд RFID уншигдсан"
          value={
            livestock.lastScan
              ? formatDateTime(livestock.lastScan.scannedAt)
              : 'Одоогоор уншилт алга'
          }
        />
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stateWrap: {
    flex: 1,
    backgroundColor: '#F6F3EA',
    padding: 20,
    justifyContent: 'center',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#F6F3EA',
    padding: 20,
  },
  imageWrap: {
    height: 220,
    borderRadius: 8,
    backgroundColor: '#E9DFC9',
    overflow: 'hidden',
    marginBottom: 18,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageText: {
    color: '#6E5B3E',
    fontSize: 30,
    fontWeight: '800',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: '#6E5B3E',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 4,
  },
  title: {
    color: '#242016',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 4,
  },
  name: {
    color: '#5E5545',
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  primaryAction: {
    flex: 1,
    minHeight: 48,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#6E5B3E',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 48,
    textAlign: 'center',
  },
  secondaryAction: {
    flex: 1,
    minHeight: 48,
    overflow: 'hidden',
    borderRadius: 8,
    borderColor: '#D8CAB1',
    borderWidth: 1,
    backgroundColor: '#FFFDF7',
    color: '#6E5B3E',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 48,
    textAlign: 'center',
  },
  section: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2D8C4',
    backgroundColor: '#FFFDF7',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  rfidTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
  },
  sectionTitle: {
    color: '#242016',
    fontSize: 18,
    fontWeight: '800',
  },
  infoRow: {
    minHeight: 58,
    borderBottomColor: '#ECE2D0',
    borderBottomWidth: 1,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    color: '#756B5C',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoValue: {
    color: '#242016',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
});
