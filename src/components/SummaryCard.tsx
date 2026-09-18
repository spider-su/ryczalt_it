import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AccountingMonth } from '../model/accounting';
import { formatMoney } from '../utils/money';
import { theme } from '../theme/theme';
import { t } from '../i18n';

type Props = {
  month: AccountingMonth;
};

export function SummaryCard({ month }: Props) {
  const matched = month.attentionCount === 0 && month.nextAction !== 'REVIEW';

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View>
          <Text style={styles.total}>{formatMoney(month.totalToPay)}</Text>
          <Text style={styles.caption}>{t('home.obligations')}</Text>
        </View>

        <View style={[styles.status, !matched && styles.statusWarning]}>
          <Ionicons
            name={matched ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={matched ? theme.colors.success : theme.colors.warning}
          />
          <Text style={[styles.statusText, !matched && styles.statusWarningText]}>
            {matched ? t('home.noIssues') : t('home.attention')}
          </Text>
        </View>
      </View>

      <View style={styles.taxRow}>
        <TaxTile label={t('home.ryczalt')} value={formatMoney(month.taxes.ryczalt)} />
        <TaxTile label={t('payments.types.vat')} value={formatMoney(month.taxes.vat)} />
        <TaxTile label={t('payments.types.zus')} value={formatMoney(month.taxes.zus)} />
      </View>
    </View>
  );
}

function TaxTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.taxTile}>
      <Text style={styles.taxLabel}>{label}</Text>
      <Text style={styles.taxValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md
  },
  total: {
    color: theme.colors.text,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: -1
  },
  caption: {
    marginTop: 3,
    color: theme.colors.textMuted,
    fontSize: 17
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.successSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 155
  },
  statusWarning: {
    backgroundColor: theme.colors.warningSoft
  },
  statusText: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '700'
  },
  statusWarningText: {
    color: theme.colors.warning
  },
  taxRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm
  },
  taxTile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.control,
    paddingHorizontal: 10,
    paddingVertical: 13
  },
  taxLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 5
  },
  taxValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800'
  }
});
