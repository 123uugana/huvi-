import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { LivestockForm } from '@/components/livestock/LivestockForm';
import { ErrorView } from '@/components/ui/ErrorView';
import { LoadingView } from '@/components/ui/LoadingView';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import type { LivestockFormValues } from '@/schemas/livestock.schema';
import {
  getLivestockDetail,
  updateLivestock,
  uploadLivestockImage,
} from '@/services/livestock.api';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  toLivestockFormValues,
  toLivestockInput,
} from '@/utils/livestockForm';

export default function EditLivestockScreen() {
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const livestockId = Array.isArray(id) ? id[0] : id;
  const livestockQuery = useQuery({
    queryKey: ['livestock', livestockId],
    queryFn: () => getLivestockDetail(livestockId),
    enabled: Boolean(livestockId),
  });

  const updateMutation = useMutation({
    mutationFn: async (values: LivestockFormValues) => {
      const uploadResponse = values.imageUrl
        ? await uploadLivestockImage(values.imageUrl)
        : undefined;

      return updateLivestock(
        livestockId,
        toLivestockInput(values, uploadResponse?.data.url ?? null),
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['livestock'] }),
        queryClient.invalidateQueries({ queryKey: ['livestock', livestockId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['missing-livestock'] }),
      ]);
      Alert.alert('Амжилттай', 'Малын мэдээлэл шинэчлэгдлээ.');
      router.back();
    },
    onError: (error) => {
      Alert.alert('Алдаа', getErrorMessage(error));
    },
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
    <ScreenContainer>
      <Text style={styles.eyebrow}>Малын мэдээлэл</Text>
      <Text style={styles.title}>Засах</Text>
      <Text style={styles.description}>
        {livestock.earNumber} дугаартай малын бүртгэлийг шинэчилнэ.
      </Text>
      <LivestockForm
        defaultValues={toLivestockFormValues(livestock)}
        isSubmitting={updateMutation.isPending}
        onSubmit={(values) => updateMutation.mutate(values)}
        submitTitle="Хадгалах"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stateWrap: {
    flex: 1,
    backgroundColor: '#F6F3EA',
    padding: 20,
    justifyContent: 'center',
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
    marginBottom: 8,
  },
  description: {
    color: '#5E5545',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
});
