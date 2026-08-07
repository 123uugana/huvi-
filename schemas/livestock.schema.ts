import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const livestockSchema = z.object({
  earNumber: z.string().trim().min(1, 'Малын дугаар оруулна уу.'),
  name: z.string().trim().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'UNKNOWN']),
  birthYear: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d{4}$/.test(value), {
      message: 'Төрсөн он 4 оронтой байна.',
    })
    .refine((value) => !value || Number(value) <= currentYear, {
      message: 'Төрсөн он ирээдүйд байж болохгүй.',
    }),
  color: z.string().trim().optional(),
  markDescription: z.string().trim().optional(),
  rfidEpc: z.string().trim().optional(),
  imageUrl: z.string().optional(),
});

export type LivestockFormValues = z.infer<typeof livestockSchema>;
