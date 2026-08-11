import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { colors, radius } from '@/constants/theme';
import {
  LoginFormValues,
  loginSchema,
} from '@/schemas/auth.schema';
import { sendOtp } from '@/services/auth.api';
import { getErrorMessage } from '@/utils/getErrorMessage';

export default function LoginScreen() {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<LoginFormValues>({
    defaultValues: {
      phoneNumber: '',
    },
    resolver: zodResolver(loginSchema),
  });

  const sendOtpMutation = useMutation({
    mutationFn: (phoneNumber: string) => sendOtp(phoneNumber),
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      await sendOtpMutation.mutateAsync(values.phoneNumber);
      router.push({
        pathname: '/(auth)/otp',
        params: { phoneNumber: values.phoneNumber },
      });
    } catch (error) {
      setError('phoneNumber', {
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.brandBlock}>
        <View style={styles.logo}>
          <Ionicons color={colors.primary} name="paw" size={42} />
        </View>
        <Text style={styles.brand}>ХЭНЦ ХУРГА</Text>
        <Text style={styles.title}>Утасны дугаараа оруулна уу</Text>
        <Text style={styles.subtitle}>
          Таны бүртгэлтэй дугаар руу баталгаажуулах код илгээнэ.
        </Text>
      </View>

      <View style={styles.panel}>
        <Controller
          control={control}
          name="phoneNumber"
          render={({ field: { onBlur, onChange, value } }) => (
            <AppInput
              autoComplete="tel"
              error={errors.phoneNumber?.message}
              keyboardType="number-pad"
              label="Утасны дугаар"
              maxLength={8}
              onBlur={onBlur}
              onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
              placeholder="99112233"
              prefix="+976"
              returnKeyType="done"
              textContentType="telephoneNumber"
              value={value}
            />
          )}
        />

        <AppButton
          disabled={isSubmitting}
          loading={sendOtpMutation.isPending}
          onPress={handleSubmit(onSubmit)}
          title="Код авах"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  brandBlock: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 32,
  },
  logo: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 46,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.surface,
    marginBottom: 18,
  },
  brand: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 18,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 30,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 18,
  },
});
