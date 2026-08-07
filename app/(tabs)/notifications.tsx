import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.title}>Мэдэгдэл</Text>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Мэдэгдлийн tab бэлэн</Text>
        <Text style={styles.panelText}>
          Push notification бүртгэл болон жагсаалт Phase 14 дээр орно.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F3EA',
    paddingHorizontal: 20,
  },
  title: {
    color: '#242016',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 22,
  },
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2D8C4',
    backgroundColor: '#FFFDF7',
    padding: 18,
  },
  panelTitle: {
    color: '#242016',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  panelText: {
    color: '#5E5545',
    fontSize: 15,
    lineHeight: 22,
  },
});
