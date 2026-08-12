import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { colors, radius } from '@/constants/theme';
import { OtpFormValues, otpSchema } from '@/schemas/auth.schema';
import { verifyOtp } from '@/services/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { getErrorMessage } from '@/utils/getErrorMessage';

export default function OtpScreen() {
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber?: string }>();
  const setAuth = useAuthStore((state) => state.setAuth);
  const resolvedPhoneNumber = Array.isArray(phoneNumber)
    ? phoneNumber[0]
    : phoneNumber;

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<OtpFormValues>({
    defaultValues: {
      code: "",
    },
    resolver: zodResolver(otpSchema),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (code: string) => {
      if (!resolvedPhoneNumber) {
        throw new Error("Утасны дугаар олдсонгүй.");
      }

      return verifyOtp(resolvedPhoneNumber, code);
    },
  });

  async function onSubmit(values: OtpFormValues) {
    try {
      const response = await verifyOtpMutation.mutateAsync(values.code);
      await setAuth(response.data);

      router.replace(
        response.data.requiresProfileSetup
          ? "/(auth)/profile-setup"
          : "/(tabs)",
      );
    } catch (error) {
      setError("code", {
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>Баталгаажуулах</Text>
        <Text style={styles.title}>Баталгаажуулах код</Text>
        <Text style={styles.subtitle}>
          {resolvedPhoneNumber
            ? `+976 ${resolvedPhoneNumber} дугаарт илгээсэн 6 оронтой кодыг оруулна уу.`
            : "Утасны дугаар олдсонгүй. Нэвтрэх дэлгэц рүү буцна уу."}
        </Text>
      </View>

      <View style={styles.panel}>
        <Controller
          control={control}
          name="code"
          render={({ field: { onBlur, onChange, value } }) => (
            <AppInput
              error={errors.code?.message}
              keyboardType="number-pad"
              label="Баталгаажуулах код"
              maxLength={6}
              onBlur={onBlur}
              onChangeText={(text) => onChange(text.replace(/\D/g, ""))}
              placeholder="000000"
              returnKeyType="done"
              textContentType="oneTimeCode"
              value={value}
            />
          )}
        />

        <AppButton
          disabled={!resolvedPhoneNumber || isSubmitting}
          loading={verifyOtpMutation.isPending}
          onPress={handleSubmit(onSubmit)}
          title="Баталгаажуулах"
        />
      </View>

      <Link href="/(auth)/login" style={styles.link}>
        Утасны дугаар солих
      </Link>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  brandBlock: {
    marginBottom: 30,
  },
  brand: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 18,
  },
  title: {
    color: colors.text,
    fontSize: 33,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 40,
    marginBottom: 10,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  link: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "800",
  },
});
