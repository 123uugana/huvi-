import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LivestockCard } from '@/components/livestock/LivestockCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorView } from '@/components/ui/ErrorView';
import { AppHeader } from '@/components/ui/AppHeader';
import { LoadingView } from '@/components/ui/LoadingView';
import { colors, radius } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getLivestock } from '@/services/livestock.api';
import { getErrorMessage } from '@/utils/getErrorMessage';

export default function LivestockTabScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const normalizedSearch = useMemo(() => search.trim(), [search]);
  const debouncedSearch = useDebouncedValue(normalizedSearch, 300);
  const livestockQuery = useQuery({
    queryKey: ['livestock', { search: debouncedSearch }],
    queryFn: () => getLivestock(debouncedSearch),
  });
  const livestock = livestockQuery.data?.data ?? [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 18 }]}>
      <AppHeader />

      <View style={styles.segmented}>
        <Text style={[styles.segmentText, styles.segmentActive]}>Дутсан (5)</Text>
        <Text style={styles.segmentText}>Ирсэн (1240)</Text>
      </View>

      <View style={styles.searchShell}>
        <Ionicons color={colors.textSubtle} name="search" size={20} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearch}
          placeholder="Дугаар, нэр, RFID EPC хайх"
          placeholderTextColor={colors.textSubtle}
          returnKeyType="search"
          style={styles.searchInput}
          value={search}
        />
        {search ? (
          <Pressable
            accessibilityLabel="Хайлтыг цэвэрлэх"
            accessibilityRole="button"
            onPress={() => setSearch('')}
            style={styles.clearButton}
          >
            <Ionicons color={colors.textSubtle} name="close-circle" size={20} />
          </Pressable>
        ) : null}
      </View>

      {livestockQuery.isLoading ? (
        <LoadingView />
      ) : livestockQuery.isError ? (
        <ErrorView
          message={getErrorMessage(livestockQuery.error)}
          onRetry={() => livestockQuery.refetch()}
        />
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 92 },
            livestock.length === 0 ? styles.emptyList : undefined,
          ]}
          data={livestock}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={livestockQuery.isRefetching}
              tintColor={colors.primary}
              onRefresh={livestockQuery.refetch}
            />
          }
          renderItem={({ item }) => <LivestockCard livestock={item} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              actionTitle="+ Мал бүртгэх"
              message={
                debouncedSearch
                  ? 'Хайлтад тохирох мал олдсонгүй.'
                  : 'Одоогоор бүртгэлтэй мал алга.'
              }
              onAction={() => router.push('/livestock/create')}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  segmented: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  segmentText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 40,
    textAlign: 'center',
  },
  segmentActive: {
    color: colors.primary,
    borderBottomColor: colors.primary,
    borderBottomWidth: 2,
  },
  searchShell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    minHeight: 50,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  clearButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingTop: 2,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
