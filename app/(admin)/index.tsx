import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '@/components/ui/AppButton';
import { colors, radius } from '@/constants/theme';
import { getDashboard } from '@/services/dashboard.api';
import { getMissingLivestock } from '@/services/reports.api';
import { getErrorMessage } from '@/utils/getErrorMessage';

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const dashboardQuery = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getDashboard,
  });
  const missingQuery = useQuery({
    queryKey: ['admin-missing-livestock'],
    queryFn: getMissingLivestock,
  });

  const dashboard = dashboardQuery.data?.data;
  const missingLivestock = missingQuery.data?.data ?? [];

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 96 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>Хэнц Хурга</Text>
      <Text style={styles.title}>Хянах самбар</Text>

      {dashboardQuery.isLoading ? (
        <View style={styles.statePanel}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Мэдээлэл ачаалж байна...</Text>
        </View>
      ) : dashboardQuery.isError ? (
        <View style={styles.statePanel}>
          <Text style={styles.stateTitle}>Мэдээлэл татаж чадсангүй.</Text>
          <Text style={styles.stateText}>{getErrorMessage(dashboardQuery.error)}</Text>
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
              <Ionicons color={colors.danger} name="warning-outline" size={22} />
            </View>
            <View style={styles.alertBody}>
              <Text style={styles.alertTitle}>{dashboard.missingCount} мал дутлаа</Text>
              <Text style={styles.alertText}>Өнөөдрийн хяналтын мэдээ шинэчлэгдсэн.</Text>
            </View>
          </View>

          <View style={styles.grid}>
            <AdminMetric label="Нийт мал" value={dashboard.totalLivestock} />
            <AdminMetric label="Өнөөдөр RFID" value={dashboard.scannedToday} />
            <AdminMetric label="Дутуу мал" tone="danger" value={dashboard.missingCount} />
            <AdminMetric label="RFID байхгүй" value={dashboard.unknownTagCount} />
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Дутуу малын жагсаалт</Text>
            {missingQuery.isLoading ? (
              <Text style={styles.emptyText}>Ачаалж байна...</Text>
            ) : missingLivestock.length > 0 ? (
              missingLivestock.map((item) => (
                <View key={item.id} style={styles.row}>
                  <Text style={styles.rowTitle}>
                    {item.earNumber}
                    {item.name ? ` · ${item.name}` : ''}
                  </Text>
                  <Text style={styles.rowMeta}>{item.lastSeenAt ?? 'Сүүлд уншигдаагүй'}</Text>
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

function AdminMetric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'danger';
}) {
  return (
    <View style={[styles.metric, tone === 'danger' ? styles.metricDanger : undefined]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
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
    marginBottom: 18,
  },
  alertCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    backgroundColor: colors.dangerSoft,
    padding: 16,
    marginBottom: 14,
  },
  alertIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colors.background,
    marginRight: 12,
  },
  alertBody: {
    flex: 1,
  },
  alertTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  alertText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  metric: {
    width: '47.8%',
    minHeight: 104,
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  metricDanger: {
    borderColor: colors.dangerSoft,
    backgroundColor: colors.dangerSoft,
  },
  metricValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  panel: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  row: {
    minHeight: 62,
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  rowMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 16,
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
});
