import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import {
  ProfileSetupFormValues,
  profileSetupSchema,
} from '@/schemas/auth.schema';
import { useAuthStore } from '@/store/auth.store';

export default function ProfileSetupScreen() {
  const user = useAuthStore((state) => state.user);
  const completeProfile = useAuthStore((state) => state.completeProfile);
  const {
    control,
    formState: { errors },
    handleSubmit,
  } = useForm<ProfileSetupFormValues>({
    defaultValues: {
      name: user?.name ?? '',
    },
    resolver: zodResolver(profileSetupSchema),
  });

  function onSubmit(values: ProfileSetupFormValues) {
    completeProfile(values.name.trim());
    router.replace('/(tabs)');
  }

  return (
    <ScreenContainer>
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>Профайл</Text>
        <Text style={styles.title}>Профайл тохируулах</Text>
        <Text style={styles.subtitle}>
          Малын бүртгэл дээр харагдах нэрээ оруулаад үргэлжлүүлнэ үү.
        </Text>
      </View>

      <View style={styles.panel}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onBlur, onChange, value } }) => (
            <AppInput
              autoCapitalize="words"
              error={errors.name?.message}
              label="Нэр"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Ууганбаяр"
              returnKeyType="done"
              value={value}
            />
          )}
        />
        <AppButton onPress={handleSubmit(onSubmit)} title="Хадгалах" />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  brandBlock: {
    marginBottom: 30,
  },
  brand: {
    color: '#6E5B3E',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 18,
  },
  title: {
    color: '#242016',
    fontSize: 33,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 40,
    marginBottom: 10,
  },
  subtitle: {
    color: '#5E5545',
    fontSize: 16,
    lineHeight: 24,
  },
  panel: {
    backgroundColor: '#FFFDF7',
    borderColor: '#E2D8C4',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
});
