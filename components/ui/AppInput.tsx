import { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, radius } from '@/constants/theme';

type AppInputProps = TextInputProps & {
  label: string;
  error?: string;
  prefix?: string;
};

export const AppInput = forwardRef<TextInput, AppInputProps>(
  ({ label, error, prefix, style, multiline, ...props }, ref) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          multiline ? styles.multilineShell : undefined,
          error ? styles.inputError : undefined,
        ]}
      >
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          multiline={multiline}
          ref={ref}
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, multiline ? styles.multilineInput : undefined, style]}
          {...props}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  ),
);

AppInput.displayName = 'AppInput';

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
  inputShell: {
    minHeight: 54,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceAlt,
  },
  inputError: {
    borderColor: colors.danger,
  },
  multilineShell: {
    minHeight: 96,
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  prefix: {
    color: colors.textSubtle,
    fontSize: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    minHeight: 52,
  },
  multilineInput: {
    minHeight: 86,
    textAlignVertical: 'top',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
});
