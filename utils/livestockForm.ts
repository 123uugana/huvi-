import type { LivestockFormValues } from '@/schemas/livestock.schema';
import type { Livestock, LivestockInput } from '@/types/livestock';

function optionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function toLivestockInput(
  values: LivestockFormValues,
  imageUrl?: string | null,
): LivestockInput {
  return {
    earNumber: values.earNumber.trim(),
    name: optionalText(values.name),
    gender: values.gender,
    birthYear: values.birthYear ? Number(values.birthYear) : undefined,
    color: optionalText(values.color),
    markDescription: optionalText(values.markDescription),
    rfidEpc: optionalText(values.rfidEpc),
    imageUrl: imageUrl ?? values.imageUrl ?? null,
  };
}

export function toLivestockFormValues(
  livestock: Livestock,
): LivestockFormValues {
  return {
    earNumber: livestock.earNumber,
    name: livestock.name ?? '',
    gender: livestock.gender,
    birthYear: livestock.birthYear ? String(livestock.birthYear) : '',
    color: livestock.color ?? '',
    markDescription: livestock.markDescription ?? '',
    rfidEpc: livestock.rfidTag?.epc ?? '',
    imageUrl: livestock.imageUrl ?? undefined,
  };
}
