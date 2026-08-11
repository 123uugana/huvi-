import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { colors, radius } from '@/constants/theme';
import {
  LivestockFormValues,
  livestockSchema,
} from '@/schemas/livestock.schema';
import type { LivestockGender } from '@/types/livestock';
import { formatGender } from '@/utils/livestockLabels';
import { LivestockImagePicker } from './LivestockImagePicker';

type LivestockFormProps = {
  defaultValues?: Partial<LivestockFormValues>;
  isSubmitting?: boolean;
  submitTitle: string;
  onSubmit: (values: LivestockFormValues) => void;
};

const genders: LivestockGender[] = ['FEMALE', 'MALE', 'UNKNOWN'];

export function LivestockForm({
  defaultValues,
  isSubmitting,
  submitTitle,
  onSubmit,
}: LivestockFormProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
  } = useForm<LivestockFormValues>({
    defaultValues: {
      earNumber: '',
      name: '',
      gender: 'UNKNOWN',
      birthYear: '',
      color: '',
      markDescription: '',
      rfidEpc: '',
      imageUrl: undefined,
      ...defaultValues,
    },
    resolver: zodResolver(livestockSchema),
  });

  return (
    <View style={styles.panel}>
      <Controller
        control={control}
        name="imageUrl"
        render={({ field: { onChange, value } }) => (
          <LivestockImagePicker onChange={onChange} value={value} />
        )}
      />

      <Controller
        control={control}
        name="earNumber"
        render={({ field: { onBlur, onChange, value } }) => (
          <AppInput
            autoCapitalize="characters"
            error={errors.earNumber?.message}
            label="Малын дугаар *"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="HH-001"
            returnKeyType="next"
            value={value}
          />
        )}
      />

      <Controller
        control={control}
        name="name"
        render={({ field: { onBlur, onChange, value } }) => (
          <AppInput
            error={errors.name?.message}
            label="Нэр"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Халзан"
            returnKeyType="next"
            value={value}
          />
        )}
      />

      <Controller
        control={control}
        name="gender"
        render={({ field: { onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Хүйс</Text>
            <View style={styles.segmented}>
              {genders.map((gender) => {
                const active = value === gender;

                return (
                  <Pressable
                    key={gender}
                    onPress={() => onChange(gender)}
                    style={[styles.segment, active ? styles.segmentActive : undefined]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        active ? styles.segmentTextActive : undefined,
                      ]}
                    >
                      {formatGender(gender)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />

      <Controller
        control={control}
        name="birthYear"
        render={({ field: { onBlur, onChange, value } }) => (
          <AppInput
            error={errors.birthYear?.message}
            keyboardType="number-pad"
            label="Төрсөн он"
            maxLength={4}
            onBlur={onBlur}
            onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
            placeholder="2024"
            returnKeyType="next"
            value={value}
          />
        )}
      />

      <Controller
        control={control}
        name="color"
        render={({ field: { onBlur, onChange, value } }) => (
          <AppInput
            error={errors.color?.message}
            label="Өнгө"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Цагаан"
            returnKeyType="next"
            value={value}
          />
        )}
      />

      <Controller
        control={control}
        name="markDescription"
        render={({ field: { onBlur, onChange, value } }) => (
          <AppInput
            error={errors.markDescription?.message}
            label="Им / онцлог"
            multiline
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Зүүн чих имтэй"
            returnKeyType="next"
            value={value}
          />
        )}
      />

      <Controller
        control={control}
        name="rfidEpc"
        render={({ field: { onBlur, onChange, value } }) => (
          <AppInput
            autoCapitalize="characters"
            error={errors.rfidEpc?.message}
            label="RFID EPC"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="E280699500001"
            returnKeyType="done"
            value={value}
          />
        )}
      />

      <AppButton
        disabled={isSubmitting}
        loading={isSubmitting}
        onPress={handleSubmit(onSubmit)}
        title={submitTitle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  segmented: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
  },
  segmentActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: colors.primary,
  },
});
