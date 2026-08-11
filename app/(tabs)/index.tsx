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
import { AppHeader } from '@/components/ui/AppHeader';
import { colors, radius } from '@/constants/theme';
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
          tintColor={colors.primary}
          onRefresh={handleRefresh}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <AppHeader />

      {dashboardQuery.isLoading ? (
        <View style={styles.statePanel}>
          <ActivityIndicator color={colors.primary} />
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
          <View style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <Text style={styles.alertIconText}>!</Text>
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Өнөөдрийн дутуу мал</Text>
              <Text style={styles.alertCount}>{dashboard.missingCount}</Text>
              <Text style={styles.alertMeta}>толгой</Text>
            </View>
            <AppButton title="Дэлгэрэнгүй" variant="secondary" />
          </View>

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
            <Text style={styles.sectionTitle}>Сүүлийн уншилтууд</Text>
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
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  alertCard: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#8A2F55',
    backgroundColor: '#321127',
    padding: 14,
    marginBottom: 14,
  },
  alertIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#FF99AA',
    marginRight: 12,
  },
  alertIconText: {
    color: '#FFB5BE',
    fontSize: 20,
    fontWeight: '800',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    color: '#FFB5BE',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
    marginBottom: 4,
  },
  alertCount: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
  },
  alertMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
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
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  statePanel: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 12,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textMuted,
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
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  missingTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  missingMeta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
