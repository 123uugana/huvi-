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
import { LoadingView } from '@/components/ui/LoadingView';
import { getLivestock } from '@/services/livestock.api';
import { getErrorMessage } from '@/utils/getErrorMessage';

export default function LivestockTabScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const normalizedSearch = useMemo(() => search.trim(), [search]);
  const livestockQuery = useQuery({
    queryKey: ['livestock', { search: normalizedSearch }],
    queryFn: () => getLivestock(normalizedSearch),
  });
  const livestock = livestockQuery.data?.data ?? [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 18 }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Миний мал</Text>
          <Text style={styles.title}>Малын жагсаалт</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/livestock/create')}
          style={styles.addButton}
        >
          <Ionicons color="#FFFFFF" name="add" size={22} />
        </Pressable>
      </View>

      <View style={styles.searchShell}>
        <Ionicons color="#8B806E" name="search" size={20} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearch}
          placeholder="Дугаар, нэр, RFID EPC хайх"
          placeholderTextColor="#9A8F7D"
          returnKeyType="search"
          style={styles.searchInput}
          value={search}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} style={styles.clearButton}>
            <Ionicons color="#8B806E" name="close-circle" size={20} />
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
              tintColor="#6E5B3E"
              onRefresh={livestockQuery.refetch}
            />
          }
          renderItem={({ item }) => <LivestockCard livestock={item} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              actionTitle="+ Мал бүртгэх"
              message={
                normalizedSearch
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
    backgroundColor: '#F6F3EA',
    paddingHorizontal: 20,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
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
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
  },
  addButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#6E5B3E',
  },
  searchShell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8CAB1',
    backgroundColor: '#FFFDF7',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    minHeight: 50,
    color: '#242016',
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
