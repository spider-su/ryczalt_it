import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

type Props = {
  title: string;
  meta?: string;
  onPress?: () => void;
};

export function SectionHeader({ title, meta, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={styles.root}
    >
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        {onPress ? <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.section,
    fontWeight: '800'
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  meta: {
    color: theme.colors.textMuted,
    fontSize: 15
  }
});
