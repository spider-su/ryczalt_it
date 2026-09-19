import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatMonth, t } from '../i18n';
import { useAccountingMonth } from '../navigation/AccountingMonthContext';
import { theme } from '../theme/theme';
import { useLocale } from '../i18n/LocaleContext';

export function MonthSelector({ loading = false }: { loading?: boolean }) {
  useLocale();
  const { month, previousMonth, nextMonth, canGoNext } = useAccountingMonth();
  return <View style={styles.row} accessibilityLabel={t('month.selector')}>
    <Pressable onPress={previousMonth} style={styles.button} accessibilityRole="button" accessibilityLabel={t('month.previous')}>
      <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
    </Pressable>
    <View style={styles.center}>{loading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.label}>{formatMonth(month)}</Text>}</View>
    <Pressable onPress={nextMonth} disabled={!canGoNext} style={[styles.button, !canGoNext && styles.disabled]} accessibilityRole="button" accessibilityLabel={t('month.next')}>
      <Ionicons name="chevron-forward" size={22} color={canGoNext ? theme.colors.primary : theme.colors.textMuted} />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({ row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider }, button: { width: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.45 }, center: { flex: 1, alignItems: 'center' }, label: { color: theme.colors.textPrimary, fontSize: theme.typography.body, fontWeight: '700', textTransform: 'capitalize' } });
