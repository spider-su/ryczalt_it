import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { t } from '../i18n';

export function Screen({ children, contentStyle }: { children: ReactNode; contentStyle?: object }) {
  return <View style={styles.screen}><View style={[styles.content, contentStyle]}>{children}</View></View>;
}

export function ScreenHeader({ title, eyebrow, onBack }: { title: string; eyebrow?: string; onBack?: () => void }) {
  return <View style={styles.header}>
    {onBack ? <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={10} style={styles.back}><Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} /></Pressable> : null}
    <View style={styles.headerCopy}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.headerTitle}>{title}</Text></View>
  </View>;
}

export function Card({ children, style }: { children: ReactNode; style?: object }) { return <View style={[styles.card, style]}>{children}</View>; }

export function StatusBanner({ kind, title, body }: { kind: 'success' | 'info' | 'warning' | 'error' | 'unknown'; title: string; body?: string }) {
  const icon = kind === 'success' ? 'checkmark-circle-outline' : kind === 'error' ? 'alert-circle-outline' : kind === 'warning' ? 'warning-outline' : kind === 'unknown' ? 'help-circle-outline' : 'information-circle-outline';
  return <View style={[styles.banner, styles[`banner_${kind}`]]}><Ionicons name={icon} size={24} color={bannerColors[kind]} /><View style={styles.bannerCopy}><Text style={styles.bannerTitle}>{title}</Text>{body ? <Text style={styles.bannerBody}>{body}</Text> : null}</View></View>;
}

export function EmptyState({ title, body, icon = 'file-tray-outline' }: { title: string; body?: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={icon} size={26} color={theme.colors.textSecondary} /></View><Text style={styles.emptyTitle}>{title}</Text>{body ? <Text style={styles.emptyBody}>{body}</Text> : null}</View>;
}

export function ErrorState({ title = t('common.unavailable'), onRetry }: { title?: string; onRetry?: () => void }) {
  return <View style={styles.empty}><View style={styles.errorIcon}><Ionicons name="cloud-offline-outline" size={26} color={theme.colors.danger} /></View><Text style={styles.emptyTitle}>{title}</Text>{onRetry ? <Pressable onPress={onRetry} style={styles.textButton} accessibilityRole="button"><Text style={styles.textButtonLabel}>{t('common.retry')}</Text></Pressable> : null}</View>;
}

export function LoadingState() { return <View style={styles.loading}><ActivityIndicator size="large" color={theme.colors.accent} /><Text style={styles.loadingText}>{t('common.loading')}</Text></View>; }

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, disabled && styles.disabled, pressed && !disabled && styles.primaryPressed]}><Text style={styles.primaryLabel}>{label}</Text></Pressable>;
}

const bannerColors = { success: theme.colors.success, info: theme.colors.info, warning: theme.colors.warning, error: theme.colors.danger, unknown: theme.colors.textSecondary } as const;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginRight: 4 },
  headerCopy: { flex: 1 },
  eyebrow: { color: theme.colors.textSecondary, fontSize: theme.typography.small, fontWeight: '700', marginBottom: 3 },
  headerTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.title, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 },
  card: { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.card, borderWidth: 1, borderColor: theme.colors.borderSubtle, padding: theme.spacing.lg },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, borderRadius: theme.radius.card, padding: theme.spacing.lg, marginTop: theme.spacing.md },
  banner_success: { backgroundColor: theme.colors.successSoft }, banner_info: { backgroundColor: theme.colors.infoSoft }, banner_warning: { backgroundColor: theme.colors.warningSoft }, banner_error: { backgroundColor: theme.colors.dangerSoft }, banner_unknown: { backgroundColor: theme.colors.surfaceSecondary },
  bannerCopy: { flex: 1 }, bannerTitle: { color: theme.colors.textPrimary, fontSize: 17, lineHeight: 22, fontWeight: '800' }, bannerBody: { color: theme.colors.textSecondary, lineHeight: 20, marginTop: 4 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xxxl, paddingHorizontal: theme.spacing.xl }, emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceSecondary, marginBottom: theme.spacing.md }, errorIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.dangerSoft, marginBottom: theme.spacing.md }, emptyTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center' }, emptyBody: { color: theme.colors.textSecondary, lineHeight: 20, textAlign: 'center', marginTop: 6 }, textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.sm }, textButtonLabel: { color: theme.colors.accent, fontWeight: '800' }, loading: { alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.xxxl }, loadingText: { color: theme.colors.textSecondary }, primaryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.control, backgroundColor: theme.colors.accent, paddingHorizontal: theme.spacing.xl, marginTop: theme.spacing.lg }, primaryPressed: { backgroundColor: theme.colors.accentPressed }, primaryLabel: { color: theme.colors.onAccent, fontSize: 16, fontWeight: '800' }, disabled: { opacity: 0.5 }
});
