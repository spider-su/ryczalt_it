import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AccountingLine } from '../model/accounting';
import { formatMoney } from '../utils/money';
import { theme } from '../theme/theme';

type Props = {
  items: AccountingLine[];
  kind: 'income' | 'cost';
};

export function AccountingListCard({ items, kind }: Props) {
  return (
    <View style={styles.card}>
      {items.map((item, index) => (
        <Pressable
          key={item.id}
          onPress={() => {}}
          style={({ pressed }) => [
            styles.row,
            index !== items.length - 1 && styles.divider,
            pressed && styles.pressed
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${formatMoney(item.amount)}`}
        >
          <View style={[styles.icon, kind === 'cost' && styles.costIcon]}>
            <Ionicons
              name={kind === 'income' ? 'document-text-outline' : 'receipt-outline'}
              size={21}
              color={kind === 'income' ? theme.colors.success : theme.colors.danger}
            />
          </View>

          <View style={styles.copy}>
            <Text style={styles.title}>{item.title}</Text>
            {item.subtitle ? <Text style={styles.subtitle}>{item.subtitle}</Text> : null}
          </View>

          <Text style={styles.amount}>{formatMoney(item.amount)}</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border
  },
  pressed: {
    backgroundColor: theme.colors.surfaceMuted
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.successSoft
  },
  costIcon: {
    backgroundColor: theme.colors.dangerSoft
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700'
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 3
  },
  amount: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700'
  }
});
