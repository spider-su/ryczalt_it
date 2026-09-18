import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { t } from '../i18n';
import { theme } from '../theme/theme';
import { AddCostScreen } from '../actions/cost/AddCostScreen';
import { useLocale } from '../i18n/LocaleContext';

type Mode = 'sheet' | 'cost';

export function ActionLauncherScreen() {
  useLocale();
  const focused = useIsFocused();
  const [mode, setMode] = useState<Mode>('sheet');
  useEffect(() => { if (focused) setMode('sheet'); }, [focused]);
  if (!focused) return null;
  return mode === 'cost' ? <AddCostScreen onBack={() => setMode('sheet')} /> : <ActionSheet onSelect={() => setMode('cost')} />;
}

function ActionSheet({ onSelect }: { onSelect: () => void }) {
  return <View style={styles.overlay}><View style={styles.sheet}><Text style={styles.title}>{t('actions.title')}</Text><Pressable style={styles.action} onPress={onSelect} accessibilityRole="button" accessibilityLabel={t('actions.cost')}><View style={styles.icon}><Ionicons name="attach-outline" size={22} color={theme.colors.primary} /></View><Text style={styles.actionText}>{t('actions.cost')}</Text><Ionicons name="chevron-forward" size={19} color={theme.colors.textMuted} /></Pressable></View></View>;
}

const styles = StyleSheet.create({ overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }, sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl, gap: theme.spacing.md }, title: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: theme.spacing.xs }, action: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.borderSubtle }, icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, actionText: { flex: 1, color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' } });
