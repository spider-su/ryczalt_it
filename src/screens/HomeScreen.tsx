import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AccountingMonth } from '../model/accounting';
import { createAccountingRepository, DEFAULT_ACCOUNTING_MONTH } from '../api/config';
import { SummaryCard } from '../components/SummaryCard';
import { AccountingListCard } from '../components/AccountingListCard';
import { PaymentCard } from '../components/PaymentCard';
import { SectionHeader } from '../components/SectionHeader';
import { theme } from '../theme/theme';
import { ApiError, ConfigurationError } from '../api/client';

function accountingErrorMessage(error: unknown): string {
  if (error instanceof ConfigurationError) return 'Accounting API configuration is invalid';
  if (error instanceof ApiError) return error.message;
  return 'Accounting data could not be processed';
}

export function HomeScreen() {
  const [month, setMonth] = useState<AccountingMonth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_ACCOUNTING_MONTH);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const repository = useMemo(() => createAccountingRepository(), []);

  useEffect(() => {
    let active = true;
    setMonth(null);
    setError(null);
    repository
      .getMonth(selectedMonth)
      .then((value) => {
        if (active) setMonth(value);
      })
      .catch((reason: unknown) => {
        console.error('[accounting] load failed', reason);
        if (active) setError(accountingErrorMessage(reason));
      });
    return () => {
      active = false;
    };
  }, [repository, selectedMonth]);

  if (error) {
    return (
      <SafeAreaView style={styles.loading}>
        <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.warning} />
        <Text style={styles.errorTitle}>Accounting data unavailable</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setMonth(null);
            repository.getMonth(selectedMonth).then(setMonth).catch((reason: unknown) => {
              console.error('[accounting] load failed', reason);
              setError(accountingErrorMessage(reason));
            });
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!month) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Accounting</Text>

          <Pressable
            style={styles.monthButton}
            onPress={() => setMonthPickerVisible((visible) => !visible)}
            accessibilityRole="button"
            accessibilityLabel="Change accounting month"
          >
            <Ionicons name="calendar-outline" size={18} color={theme.colors.text} />
            <Text style={styles.monthText}>{month.label}</Text>
            <Ionicons name="chevron-down" size={17} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        {monthPickerVisible ? (
          <View style={styles.monthPicker}>
            <Pressable
              style={styles.monthStep}
              onPress={() => setSelectedMonth((value) => shiftMonth(value, -1))}
              accessibilityLabel="Previous accounting month"
            >
              <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
            </Pressable>
            <Text style={styles.monthPickerText}>{selectedMonth}</Text>
            <Pressable
              style={styles.monthStep}
              onPress={() => setSelectedMonth((value) => shiftMonth(value, 1))}
              accessibilityLabel="Next accounting month"
            >
              <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.due}>{month.dueLabel}</Text>

        <SummaryCard month={month} />

        <View style={styles.section}>
          <SectionHeader title="Income" meta={`${month.income.length} invoices`} onPress={() => {}} />
          <AccountingListCard items={month.income} kind="income" />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Costs" meta={`${month.costs.length} documents`} onPress={() => {}} />
          <AccountingListCard items={month.costs} kind="cost" />
        </View>

        <View style={styles.section}>
          <SectionHeader title="To pay" onPress={() => {}} />
          <PaymentCard items={month.payments} />
        </View>

        <Pressable style={styles.attentionCard} onPress={() => {}}>
          <View style={styles.attentionIcon}>
            <Ionicons name="alert-circle-outline" size={22} color={theme.colors.warning} />
          </View>
          <View style={styles.attentionCopy}>
            <Text style={styles.attentionTitle}>Needs attention</Text>
            <Text style={styles.attentionText}>
              {month.attentionCount} accounting item requires review
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 32
  },
  header: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: '900',
    letterSpacing: -0.8
  },
  monthButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12
  },
  monthText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700'
  },
  monthPicker: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    padding: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  monthStep: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted
  },
  monthPickerText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700'
  },
  due: {
    alignSelf: 'flex-end',
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 14
  },
  section: {
    marginTop: theme.spacing.xl,
    gap: 8
  },
  attentionCard: {
    marginTop: theme.spacing.xl,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warningSoft
  },
  attentionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFFAA',
    alignItems: 'center',
    justifyContent: 'center'
  },
  attentionCopy: {
    flex: 1
  },
  attentionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800'
  },
  attentionText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 2
  },
  errorTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12
  },
  errorText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 11
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '800'
  }
});

function shiftMonth(month: string, offset: number): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
