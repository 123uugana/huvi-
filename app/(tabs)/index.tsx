import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecentActivityItem } from '@/components/dashboard/RecentActivityItem';
import { StatCard } from '@/components/dashboard/StatCard';
import { AppButton } from '@/components/ui/AppButton';
import { getDashboard } from '@/services/dashboard.api';
import { getMissingLivestock } from '@/services/reports.api';
import { useAuthStore } from '@/store/auth.store';
import { formatDateTime } from '@/utils/formatDate';
import { getErrorMessage } from '@/utils/getErrorMessage';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });
  const missingQuery = useQuery({
    queryKey: ['missing-livestock'],
    queryFn: getMissingLivestock,
  });

  const dashboard = dashboardQuery.data?.data;
  const missingLivestock = missingQuery.data?.data ?? [];

  async function handleRefresh() {
    await Promise.all([dashboardQuery.refetch(), missingQuery.refetch()]);
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 96 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={dashboardQuery.isRefetching || missingQuery.isRefetching}
          tintColor="#6E5B3E"
          onRefresh={handleRefresh}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.greeting}>Сайн байна уу,</Text>
      <Text style={styles.title}>{user?.name ?? 'Малчин'}</Text>

      {dashboardQuery.isLoading ? (
        <View style={styles.statePanel}>
          <ActivityIndicator color="#6E5B3E" />
          <Text style={styles.stateText}>Мэдээлэл ачаалж байна...</Text>
        </View>
      ) : dashboardQuery.isError ? (
        <View style={styles.statePanel}>
          <Text style={styles.stateTitle}>Сервертэй холбогдож чадсангүй.</Text>
          <Text style={styles.stateText}>
            {getErrorMessage(dashboardQuery.error)}
          </Text>
          <AppButton
            onPress={() => dashboardQuery.refetch()}
            title="Дахин оролдох"
            variant="secondary"
          />
        </View>
      ) : dashboard ? (
        <>
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <StatCard label="Нийт мал" value={dashboard.totalLivestock} />
              <StatCard
                label="Өнөөдөр бүртгэгдсэн"
                value={dashboard.scannedToday}
              />
            </View>
            <View style={styles.gridRow}>
              <StatCard
                label="Дутуу мал"
                tone="warning"
                value={dashboard.missingCount}
              />
              <StatCard
                label="Танигдаагүй RFID"
                tone="warning"
                value={dashboard.unknownTagCount}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Сүүлийн RFID бүртгэл</Text>
            {dashboard.recentScans.length > 0 ? (
              dashboard.recentScans.map((scan) => (
                <RecentActivityItem key={scan.id} scan={scan} />
              ))
            ) : (
              <Text style={styles.emptyText}>Одоогоор RFID бүртгэл алга.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Дутуу мал</Text>
            {missingQuery.isLoading ? (
              <Text style={styles.emptyText}>Мэдээлэл ачаалж байна...</Text>
            ) : missingQuery.isError ? (
              <View style={styles.inlineError}>
                <Text style={styles.emptyText}>
                  {getErrorMessage(missingQuery.error)}
                </Text>
                <AppButton
                  onPress={() => missingQuery.refetch()}
                  title="Дахин оролдох"
                  variant="secondary"
                />
              </View>
            ) : missingLivestock.length > 0 ? (
              missingLivestock.map((item) => (
                <View key={item.id} style={styles.missingRow}>
                  <Text style={styles.missingTitle}>
                    {item.earNumber}
                    {item.name ? ` · ${item.name}` : ''}
                  </Text>
                  <Text style={styles.missingMeta}>
                    Сүүлд RFID уншигдсан:{' '}
                    {item.lastSeenAt
                      ? formatDateTime(item.lastSeenAt)
                      : 'Тодорхойгүй'}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Одоогоор дутуу мал алга.</Text>
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F6F3EA',
    paddingHorizontal: 20,
  },
  greeting: {
    color: '#6D6251',
    fontSize: 16,
    lineHeight: 22,
  },
  title: {
    color: '#242016',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 22,
  },
  grid: {
    gap: 12,
    marginBottom: 18,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  section: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2D8C4',
    backgroundColor: '#FFFDF7',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#242016',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  statePanel: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2D8C4',
    backgroundColor: '#FFFDF7',
    padding: 18,
    gap: 12,
  },
  stateTitle: {
    color: '#242016',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: '#655C4D',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyText: {
    color: '#655C4D',
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 16,
  },
  inlineError: {
    paddingBottom: 16,
    gap: 10,
  },
  missingRow: {
    minHeight: 64,
    borderBottomColor: '#ECE2D0',
    borderBottomWidth: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  missingTitle: {
    color: '#242016',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  missingMeta: {
    color: '#6B6254',
    fontSize: 13,
    lineHeight: 18,
  },
});
