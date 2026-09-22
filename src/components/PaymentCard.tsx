import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Obligation } from '../model/accounting';
import { formatMoneyWithoutCurrency } from '../utils/money';
import { theme } from '../theme/theme';

export function PaymentCard({ items, onItemPress }: { items: Obligation[]; onItemPress?: (item: Obligation) => void }) {
  return (
    <View style={styles.card}>
      {items.map((item, index) => (
        <Pressable
          key={item.id}
          onPress={() => onItemPress?.(item)}
          disabled={!onItemPress}
          style={({ pressed }) => [
            styles.row,
            index !== items.length - 1 && styles.divider,
            pressed && styles.pressed
          ]}
        >
          <View style={styles.icon}>
            <Ionicons name="business-outline" size={21} color={theme.colors.primary} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.dueDate ? `Due ${item.dueDate}` : 'Due date not available'} · {item.status}</Text>
          </View>
          <View style={styles.amountCopy}><Text style={styles.amount}>{formatMoneyWithoutCurrency(item.outstandingAmount)}</Text><Text style={styles.expected}>of {formatMoneyWithoutCurrency(item.amount)}</Text></View>
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
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderSubtle
  },
  pressed: {
    backgroundColor: theme.colors.surfaceSecondary
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft
  },
  copy: {
    flex: 1
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 3
  },
  amountCopy: { alignItems: 'flex-end' },
  expected: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 },
  amount: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '800'
  }
});
