import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, StyleSheet, Text } from 'react-native';
import { LivestockForm } from '@/components/livestock/LivestockForm';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { colors } from '@/constants/theme';
import type { LivestockFormValues } from '@/schemas/livestock.schema';
import {
  createLivestock,
  uploadLivestockImage,
} from '@/services/livestock.api';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { toLivestockInput } from '@/utils/livestockForm';

export default function CreateLivestockScreen() {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: async (values: LivestockFormValues) => {
      const uploadResponse = values.imageUrl
        ? await uploadLivestockImage(values.imageUrl)
        : undefined;

      return createLivestock(
        toLivestockInput(values, uploadResponse?.data.url ?? null),
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['livestock'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['missing-livestock'] }),
      ]);
      Alert.alert('Амжилттай', 'Малын мэдээлэл хадгалагдлаа.');

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/livestock');
      }
    },
    onError: (error) => {
      Alert.alert('Алдаа', getErrorMessage(error));
    },
  });

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>Миний мал</Text>
      <Text style={styles.title}>Мал бүртгэх</Text>
      <Text style={styles.description}>
        Үндсэн мэдээллийг оруулаад RFID EPC-г backend бүртгэлтэй тохируулна.
      </Text>
      <LivestockForm
        isSubmitting={createMutation.isPending}
        onSubmit={(values) => createMutation.mutate(values)}
        submitTitle="Хадгалах"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
});
