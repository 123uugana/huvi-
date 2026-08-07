import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
            <Text style={styles.imageText}>{livestock.earNumber.slice(-3)}</Text>
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
            {formatGender(livestock.gender)} · RFID:{' '}
            {livestock.rfidTag?.epc ? 'Холбогдсон' : 'Бүртгээгүй'}
          </Text>
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2D8C4',
    backgroundColor: '#FFFDF7',
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
    borderRadius: 8,
    backgroundColor: '#E9DFC9',
    overflow: 'hidden',
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageText: {
    color: '#6E5B3E',
    fontSize: 24,
    fontWeight: '800',
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
    color: '#242016',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  name: {
    color: '#5E5545',
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    color: '#4F4636',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 6,
  },
  scan: {
    color: '#756B5C',
    fontSize: 12,
    lineHeight: 17,
  },
});
