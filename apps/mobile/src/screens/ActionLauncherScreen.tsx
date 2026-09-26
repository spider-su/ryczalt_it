import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { t } from '../i18n';
import { ACCOUNTING_DATA_SOURCE, isDemoMode } from '../api/config';
import { createThemeStyles, theme, useTheme } from '../theme/theme';
import { AddCostScreen } from '../actions/cost/AddCostScreen';
import { useLocale } from '../i18n/LocaleContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetHeader } from '../components/ui';
import type { AppTabParamList } from '../navigation/AppNavigator';

type Mode = 'sheet' | 'manual' | 'import';

export function ActionLauncherScreen() {
  useTheme();
  useLocale();
  const focused = useIsFocused();
  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const [mode, setMode] = useState<Mode>('sheet');
  useEffect(() => { if (focused) setMode('sheet'); }, [focused]);
  if (!focused) return null;
  const dismiss = () => { if (navigation.canGoBack()) navigation.goBack(); else navigation.navigate('Home'); };
  return mode !== 'sheet' ? <AddCostScreen initialMode={mode === 'manual' ? 'manual' : 'file'} onBack={() => setMode('sheet')} /> : <ActionSheet manualEnabled={isDemoMode() || ACCOUNTING_DATA_SOURCE === 'mock'} onSelect={setMode} onDismiss={dismiss} />;
}

function ActionSheet({ manualEnabled, onSelect, onDismiss }: { manualEnabled: boolean; onSelect: (mode: Exclude<Mode, 'sheet'>) => void; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  return <View style={styles.overlay} accessibilityViewIsModal><Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityRole="button" accessibilityLabel={t('actions.close')} /><View style={[styles.sheet, { paddingBottom: Math.max(theme.spacing.lg, insets.bottom) }]}><SheetHeader title={t('actions.title')} onClose={onDismiss} />{manualEnabled ? <Action onPress={() => onSelect('manual')} icon="create-outline" title={t('actions.manualInvoice')} subtitle={t('actions.manualInvoiceHint')} /> : null}<Action onPress={() => onSelect('import')} icon="cloud-upload-outline" title={t('actions.importInvoice')} subtitle={t('actions.importInvoiceHint')} /></View></View>;
}

function Action({ onPress, icon, title, subtitle }: { onPress: () => void; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  return <Pressable style={({ pressed }) => [styles.action, pressed && styles.actionPressed]} onPress={onPress} accessibilityRole="button"><View style={styles.icon}><Ionicons name={icon} size={22} color={theme.colors.primary} /></View><View style={styles.copy}><Text style={styles.actionText}>{title}</Text><Text style={styles.actionSubtitle}>{subtitle}</Text></View><Ionicons name="chevron-forward" size={19} color={theme.colors.textMuted} /></Pressable>;
}

const styles = createThemeStyles({ overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }, sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl, gap: theme.spacing.xs }, action: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.borderSubtle, paddingVertical: theme.spacing.sm }, actionPressed: { backgroundColor: theme.colors.surfaceSecondary }, icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, actionText: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700' }, actionSubtitle: { color: theme.colors.textSecondary, marginTop: 3, fontSize: 13 } });
