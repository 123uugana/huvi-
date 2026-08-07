import { StyleSheet, Text, View } from 'react-native';

type StatCardProps = {
  label: string;
  value: string | number;
  tone?: 'default' | 'warning';
};

export function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  return (
    <View style={[styles.card, tone === 'warning' ? styles.warning : undefined]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 106,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2D8C4',
    backgroundColor: '#FFFDF7',
    padding: 14,
    justifyContent: 'space-between',
  },
  warning: {
    borderColor: '#D9B08A',
    backgroundColor: '#FFF9EF',
  },
  value: {
    color: '#242016',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
  },
  label: {
    color: '#685E4E',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
});
