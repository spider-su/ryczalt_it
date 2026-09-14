import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

export function MoreScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>More</Text>

        <View style={styles.card}>
          <MenuRow icon="person-outline" title="Profile" />
          <MenuRow icon="refresh-outline" title="Refresh data" divider />
          <MenuRow icon="information-circle-outline" title="About" divider />
        </View>
      </View>
    </SafeAreaView>
  );
}

function MenuRow({
  icon,
  title,
  divider
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  divider?: boolean;
}) {
  return (
    <Pressable style={[styles.row, divider && styles.divider]} onPress={() => {}}>
      <Ionicons name={icon} size={22} color={theme.colors.primary} />
      <Text style={styles.rowText}>{title}</Text>
      <Ionicons name="chevron-forward" size={19} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  title: { fontSize: 32, fontWeight: '900', color: theme.colors.text, marginVertical: 12 },
  card: {
    overflow: 'hidden',
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text
  }
});
