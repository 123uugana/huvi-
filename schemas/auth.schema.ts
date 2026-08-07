import { z } from 'zod';

export const loginSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Утасны дугаараа оруулна уу.')
    .regex(/^\d+$/, 'Зөвхөн тоо оруулна уу.')
    .length(8, 'Утасны дугаар 8 оронтой байна.'),
});

export const otpSchema = z.object({
  code: z
    .string()
    .min(1, 'Баталгаажуулах код оруулна уу.')
    .regex(/^\d+$/, 'Зөвхөн тоо оруулна уу.')
    .length(6, 'Код 6 оронтой байна.'),
});

export const profileSetupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Нэр хамгийн багадаа 2 тэмдэгт байна.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;
export type ProfileSetupFormValues = z.infer<typeof profileSetupSchema>;
