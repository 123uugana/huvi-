import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';

type LivestockImagePickerProps = {
  value?: string;
  onChange: (uri?: string) => void;
};

export function LivestockImagePicker({
  value,
  onChange,
}: LivestockImagePickerProps) {
  async function pickImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Зөвшөөрөл шаардлагатай',
          'Малын зураг сонгохын тулд зурагт хандах зөвшөөрөл өгнө үү.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled) {
        onChange(result.assets[0]?.uri);
      }
    } catch {
      Alert.alert('Алдаа', 'Зураг сонгох үед алдаа гарлаа. Дахин оролдоно уу.');
    }
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Зураг</Text>
      <Pressable
        accessibilityLabel="Малын зураг сонгох"
        accessibilityRole="button"
        style={styles.picker}
        onPress={pickImage}
      >
        {value ? (
          <Image source={{ uri: value }} style={styles.image} />
        ) : (
          <View style={styles.empty}>
            <Ionicons color={colors.primary} name="image-outline" size={28} />
            <Text style={styles.emptyText}>Зураг сонгох</Text>
          </View>
        )}
      </Pressable>
      {value ? (
        <Pressable
          accessibilityRole="button"
          style={styles.removeButton}
          onPress={() => onChange(undefined)}
        >
          <Text style={styles.removeText}>Зураг устгах</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  picker: {
    height: 180,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  removeButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  removeText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
});
