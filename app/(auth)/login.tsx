import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
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
        <Text style={styles.brand}>ХЭНЦ ХУРГА</Text>
        <Text style={styles.title}>Мал сүргээ бүртгэлтэй удирдаарай</Text>
        <Text style={styles.subtitle}>
          Утасны дугаараа оруулаад баталгаажуулах код авна уу.
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
