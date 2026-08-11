import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import type { Livestock } from '@/types/livestock';
import { formatDateTime } from '@/utils/formatDate';
import { formatGender } from '@/utils/livestockLabels';
import { LivestockStatusBadge } from './LivestockStatusBadge';

type LivestockCardProps = {
  livestock: Livestock;
};

export function LivestockCard({ livestock }: LivestockCardProps) {
  return (
    <Link href={`/livestock/${livestock.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed ? styles.pressed : undefined]}>
        <View style={styles.imageWrap}>
          {livestock.imageUrl ? (
            <Image source={{ uri: livestock.imageUrl }} style={styles.image} />
          ) : (
            <Ionicons color={colors.textMuted} name="paw" size={28} />
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.earNumber}>{livestock.earNumber}</Text>
              <Text style={styles.name}>{livestock.name || 'Нэргүй'}</Text>
            </View>
            <LivestockStatusBadge status={livestock.status} />
          </View>
          <Text style={styles.meta}>
            {formatGender(livestock.gender)} · {livestock.color ?? 'Өнгө бүртгээгүй'}
          </Text>
          <View style={styles.idPill}>
            <Text style={styles.idText}>ID: {livestock.rfidTag?.epc ?? livestock.id}</Text>
          </View>
          <Text style={styles.scan}>
            {livestock.lastScan
              ? `Сүүлд RFID уншигдсан: ${formatDateTime(livestock.lastScan.scannedAt)}`
              : 'RFID уншилт бүртгэгдээгүй'}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 128,
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#172440',
    padding: 12,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.86,
  },
  imageWrap: {
    width: 92,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundElevated,
    overflow: 'hidden',
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  body: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  titleBlock: {
    flex: 1,
  },
  earNumber: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  name: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 6,
  },
  idPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 6,
  },
  idText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  scan: {
    color: colors.textSubtle,
    fontSize: 12,
    lineHeight: 17,
  },
});
