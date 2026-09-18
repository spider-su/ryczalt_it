import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createAccountingApi } from '../api/config';
import { ApiError } from '../api/client';
import { mapAutoApprovalSettings, canonicalAutoApprovalAmount, categoriesFromInput, categoriesInputValue } from '../model/automation';
import { AutoApprovalSettings } from '../model/automation';
import { ErrorState, LoadingState, PrimaryButton } from '../components/ui';
import { t } from '../i18n';
import { useAuth } from '../auth/AuthContext';
import { theme } from '../theme/theme';

export function AutomationSettingsScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { profileId } = useAuth();
  const [settings, setSettings] = useState<AutoApprovalSettings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [maxAmount, setMaxAmount] = useState('');
  const [categories, setCategories] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setLoading(true); setLoadError(false); setErrorKey(null); setSettings(null);
    if (profileId == null) { setLoadError(true); setLoading(false); return () => { active = false; }; }
    try {
      const client = createAccountingApi();
      client.getAutoApprovalSettings(profileId).then((body) => {
        if (!active) return;
        const value = mapAutoApprovalSettings(body);
        setSettings(value); setEnabled(value.enabled); setMaxAmount(value.maxAmount); setCategories(categoriesInputValue(value.trustedCategories));
      }).catch(() => active && setLoadError(true)).finally(() => active && setLoading(false));
    } catch { setLoadError(true); setLoading(false); }
    return () => { active = false; };
  }, [visible, profileId, retry]);

  const dirty = settings != null && (enabled !== settings.enabled || maxAmount !== settings.maxAmount || categoriesFromInput(categories).join('\u0000') !== settings.trustedCategories.join('\u0000'));
  async function save() {
    if (saving || !settings || profileId == null) return;
    const canonicalAmount = canonicalAutoApprovalAmount(maxAmount);
    if (!canonicalAmount) { setErrorKey('automation.errors.validation'); return; }
    setSaving(true); setErrorKey(null);
    try {
      const client = createAccountingApi();
      await client.updateAutoApprovalSettings(profileId, { enabled, maxAmount: canonicalAmount, trustedCategories: categoriesFromInput(categories) });
      let authoritative: AutoApprovalSettings;
      try {
        authoritative = mapAutoApprovalSettings(await client.getAutoApprovalSettings(profileId));
      } catch {
        setErrorKey('automation.errors.refresh');
        return;
      }
      setSettings(authoritative); setEnabled(authoritative.enabled); setMaxAmount(authoritative.maxAmount); setCategories(categoriesInputValue(authoritative.trustedCategories));
    } catch (reason) {
      setErrorKey(errorMessageKey(reason));
    } finally { setSaving(false); }
  }

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.overlay}><View style={styles.sheet}><View style={styles.header}><Text style={styles.title}>{t('automation.title')}</Text><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={10}><Ionicons name="close" size={24} color={theme.colors.textPrimary} /></Pressable></View>{loading ? <LoadingState /> : loadError ? <ErrorState title={t('automation.errors.load')} onRetry={() => setRetry((value) => value + 1)} /> : <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={styles.heading}>{t('automation.enabled')}</Text><Text style={styles.explanation}>{t('automation.explanation')}</Text><View style={styles.switchRow}><Text style={styles.label}>{t('automation.enabled')}</Text><Switch value={enabled} onValueChange={setEnabled} disabled={saving} accessibilityLabel={t('automation.enabled')} accessibilityState={{ checked: enabled, disabled: saving }} trackColor={{ false: theme.colors.borderSubtle, true: theme.colors.accentSoft }} thumbColor={enabled ? theme.colors.accent : theme.colors.textMuted} /></View><Text style={styles.heading}>{t('automation.maxAmount')}</Text><TextInput value={maxAmount} onChangeText={setMaxAmount} editable={!saving} keyboardType="decimal-pad" inputMode="decimal" style={styles.input} accessibilityLabel={t('automation.maxAmount')} placeholder={t('automation.maxAmountPlaceholder')} placeholderTextColor={theme.colors.textMuted} /><Text style={styles.hint}>{t('automation.maxAmountHint')}</Text><Text style={styles.heading}>{t('automation.categories')}</Text><TextInput value={categories} onChangeText={setCategories} editable={!saving} style={[styles.input, styles.categories]} multiline accessibilityLabel={t('automation.categories')} placeholder={t('automation.categoriesPlaceholder')} placeholderTextColor={theme.colors.textMuted} /><Text style={styles.hint}>{t('automation.categoriesHint')}</Text>{errorKey ? <Text style={styles.error}>{t(errorKey)}</Text> : null}<PrimaryButton label={saving ? t('automation.saving') : t('automation.save')} onPress={() => { void save(); }} disabled={!dirty || saving} /></ScrollView>}</View></SafeAreaView></Modal>;
}

function errorMessageKey(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.status === 403) return 'automation.errors.authorization';
    if (reason.status === 422) return 'automation.errors.validation';
    if (reason.message.toLowerCase().includes('timed out')) return 'automation.errors.timeout';
    if (reason.kind === 'unavailable') return 'automation.errors.network';
  }
  if (reason instanceof Error && reason.message === 'invalid_auto_approval_response') return 'automation.errors.response';
  return 'automation.errors.save';
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  sheet: { maxHeight: '92%', backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  title: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '800' },
  content: { paddingBottom: theme.spacing.xl },
  heading: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '800', marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  explanation: { color: theme.colors.textSecondary, lineHeight: 21 },
  switchRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.borderSubtle, marginTop: theme.spacing.md },
  label: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 16 },
  input: { minHeight: 52, borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.control, paddingHorizontal: theme.spacing.md, color: theme.colors.textPrimary, fontSize: 16, backgroundColor: theme.colors.surfaceElevated },
  categories: { minHeight: 78, textAlignVertical: 'top', paddingTop: theme.spacing.md },
  hint: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: theme.spacing.sm },
  error: { color: theme.colors.danger, lineHeight: 20, marginTop: theme.spacing.lg }
});
