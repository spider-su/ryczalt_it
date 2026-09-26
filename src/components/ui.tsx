import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createThemeStyles, theme } from '../theme/theme';
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

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={styles.pageHeader}><Text style={styles.pageTitle}>{title}</Text>{subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}</View>;
}

export function Section({ title, children, description, tone = 'primary', trailing }: { title: string; children: ReactNode; description?: string; tone?: 'primary' | 'secondary'; trailing?: ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionHeading}><Text style={[styles.sectionTitle, tone === 'secondary' && styles.sectionTitleSecondary]}>{title}</Text>{trailing}</View>{description ? <Text style={styles.sectionDescription}>{description}</Text> : null}{children}</View>;
}

export function ListGroup({ children, style }: { children: ReactNode; style?: object }) { return <View style={[styles.listGroup, style]}>{children}</View>; }

export function ListRow({ title, subtitle, value, icon, onPress, last = false, accessibilityLabel, disabled = false, disabledLabel }: { title: string; subtitle?: string; value?: string; icon?: keyof typeof Ionicons.glyphMap; onPress?: () => void; last?: boolean; accessibilityLabel?: string; disabled?: boolean; disabledLabel?: string }) {
  const content = <><View style={styles.listRowCopy}>{icon ? <Ionicons name={icon} size={20} color={theme.colors.textSecondary} style={styles.listRowIcon} /> : null}<View style={styles.listRowText}><Text style={[styles.rowTitle, disabled && styles.disabledRowText]}>{title}</Text>{subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}</View></View>{value ? <Text style={styles.rowValue}>{value}</Text> : null}{disabledLabel ? <Text style={styles.disabledRowLabel}>{disabledLabel}</Text> : null}{onPress && !disabled ? <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} /> : null}</>;
  const rowStyle = [styles.listRow, !last && styles.listDivider];
  return onPress || disabled ? <Pressable onPress={onPress} disabled={disabled || !onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled: disabled || !onPress }} style={({ pressed }) => [rowStyle, disabled && styles.disabledRow, pressed && !disabled && styles.rowPressed]}>{content}</Pressable> : <View accessibilityLabel={accessibilityLabel ?? title} style={rowStyle}>{content}</View>;
}

export function KeyValueRow({ label, value, state }: { label: string; value: string; state?: 'success' | 'attention' | 'pending' | 'error' | 'unknown' }) {
  return <View style={styles.keyValueRow}><Text style={styles.keyLabel}>{label}</Text><Text style={[styles.keyValue, state && styles[`state_${state}`]]}>{value}</Text></View>;
}

export function SegmentedControl<T extends string>({ options, selected, onSelect }: { options: { value: T; label: string }[]; selected: T; onSelect: (value: T) => void }) {
  return <View style={styles.segmented} accessibilityRole="radiogroup">{options.map((option) => <Pressable key={option.value} onPress={() => onSelect(option.value)} accessibilityRole="radio" accessibilityState={{ selected: selected === option.value }} style={[styles.segment, selected === option.value && styles.segmentSelected]}><Text style={[styles.segmentLabel, selected === option.value && styles.segmentLabelSelected]}>{option.label}</Text></Pressable>)}</View>;
}

export function SelectionList<T extends string>({ options, selected, onSelect }: { options: { value: T; label: string }[]; selected: T; onSelect: (value: T) => void }) {
  return <View accessibilityRole="radiogroup" style={styles.selectionList}>{options.map((option, index) => <Pressable key={option.value} onPress={() => onSelect(option.value)} accessibilityRole="radio" accessibilityState={{ selected: selected === option.value }} style={[styles.selectionOption, index < options.length - 1 && styles.listDivider]}><Text style={[styles.selectionLabel, selected === option.value && styles.segmentLabelSelected]}>{option.label}</Text><Ionicons name={selected === option.value ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected === option.value ? theme.colors.accent : theme.colors.textMuted} /></Pressable>)}</View>;
}

export function SearchField({ value, onChangeText, placeholder, onFilter, filterActive = false, onClear }: { value: string; onChangeText: (value: string) => void; placeholder: string; onFilter?: () => void; filterActive?: boolean; onClear?: () => void }) {
  return <View style={styles.searchField}><Ionicons name="search-outline" size={19} color={theme.colors.textMuted} /><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.colors.textMuted} style={styles.searchInput} accessibilityLabel={placeholder} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />{value && onClear ? <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel={t('common.clearSearch')} style={styles.searchAction}><Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} /></Pressable> : null}{onFilter ? <Pressable onPress={onFilter} accessibilityRole="button" accessibilityLabel={t('common.filters')} style={[styles.searchAction, filterActive && styles.searchActionActive]}><Ionicons name="options-outline" size={20} color={filterActive ? theme.colors.accent : theme.colors.textSecondary} /></Pressable> : null}</View>;
}

export function FilterButton({ onPress, active = false }: { onPress: () => void; active?: boolean }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t('common.filters')} style={[styles.filterButton, active && styles.searchActionActive]}><Ionicons name="options-outline" size={20} color={active ? theme.colors.accent : theme.colors.textSecondary} /></Pressable>;
}

export function SheetHeader({ title, onClose, back = false }: { title: string; onClose: () => void; back?: boolean }) {
  return <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{title}</Text><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={back ? t('common.back') : t('common.close')} hitSlop={10} style={styles.closeButton}><Ionicons name={back ? 'chevron-back' : 'close'} size={24} color={theme.colors.textPrimary} /></Pressable></View>;
}

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

export function SupportingText({ children }: { children: ReactNode }) { return <Text style={styles.supportingText}>{children}</Text>; }

export function FormField({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return <View style={styles.formField}><Text style={styles.formLabel}>{label}</Text>{children}{hint ? <SupportingText>{hint}</SupportingText> : null}{error ? <Text style={styles.formError}>{error}</Text> : null}</View>;
}

export function SettingsRow({ title, description, children, last = false }: { title: string; description?: string; children: ReactNode; last?: boolean }) {
  return <View style={[styles.settingsRow, !last && styles.listDivider]}><View style={styles.settingsCopy}><Text style={styles.rowTitle}>{title}</Text>{description ? <SupportingText>{description}</SupportingText> : null}</View>{children}</View>;
}

export function SettingsGroup({ children }: { children: ReactNode }) { return <ListGroup style={styles.settingsGroup}>{children}</ListGroup>; }

const bannerColors = { success: theme.colors.success, info: theme.colors.info, warning: theme.colors.warning, error: theme.colors.danger, unknown: theme.colors.textSecondary } as const;
const styles = createThemeStyles({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  pageHeader: { marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg },
  pageTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.pageTitle, lineHeight: 34, fontWeight: '800', letterSpacing: -0.4 },
  pageSubtitle: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, lineHeight: 19, marginTop: theme.spacing.xs },
  section: { marginTop: theme.spacing.xxl },
  sectionHeading: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  sectionTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.section, lineHeight: 24, fontWeight: '800' },
  sectionTitleSecondary: { color: theme.colors.textSecondary, fontSize: theme.typography.body, fontWeight: '700' },
  sectionDescription: { color: theme.colors.textSecondary, lineHeight: 20, marginBottom: theme.spacing.md },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginRight: 4 },
  headerCopy: { flex: 1 },
  eyebrow: { color: theme.colors.textSecondary, fontSize: theme.typography.small, fontWeight: '700', marginBottom: 3 },
  headerTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.title, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 },
  card: { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.card, borderWidth: 1, borderColor: theme.colors.borderSubtle, padding: theme.spacing.lg },
  listGroup: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, borderWidth: 1, borderColor: theme.colors.borderSubtle, overflow: 'hidden', ...Platform.select({ web: { boxShadow: '0px 2px 8px rgba(21, 34, 56, 0.04)' }, default: { shadowColor: '#152238', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 } }) },
  listRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg },
  listDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  rowPressed: { backgroundColor: theme.colors.surfaceSecondary },
  listRowCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  listRowIcon: { marginRight: theme.spacing.md },
  listRowText: { flex: 1, minWidth: 0 },
  rowTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, fontWeight: '600' },
  rowSubtitle: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, lineHeight: 18, marginTop: theme.spacing.xs },
  rowValue: { color: theme.colors.textPrimary, fontSize: theme.typography.body, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  disabledRow: { backgroundColor: theme.colors.surfaceSecondary },
  disabledRowText: { color: theme.colors.textMuted },
  disabledRowLabel: { color: theme.colors.textMuted, backgroundColor: theme.colors.canvas, borderRadius: theme.radius.sm, overflow: 'hidden', fontSize: theme.typography.caption, fontWeight: '700', paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  keyValueRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  keyLabel: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting },
  keyValue: { color: theme.colors.textPrimary, fontSize: theme.typography.status, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  state_success: { color: theme.colors.success }, state_attention: { color: theme.colors.warning }, state_pending: { color: theme.colors.textSecondary }, state_error: { color: theme.colors.danger }, state_unknown: { color: theme.colors.textMuted },
  segmented: { flexDirection: 'row', gap: theme.spacing.xs, padding: theme.spacing.xs, backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.control },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.sm, borderRadius: theme.radius.sm },
  segmentSelected: { backgroundColor: theme.colors.surface, ...Platform.select({ web: { boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05)' }, default: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 } }) },
  segmentLabel: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, fontWeight: '600', textAlign: 'center' },
  segmentLabelSelected: { color: theme.colors.accent, fontWeight: '700' },
  selectionList: { backgroundColor: theme.colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider },
  selectionOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingVertical: theme.spacing.sm },
  selectionLabel: { flex: 1, color: theme.colors.textPrimary, fontSize: theme.typography.supporting },
  searchField: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.control, borderWidth: 1, borderColor: theme.colors.borderSubtle, paddingHorizontal: theme.spacing.sm, ...Platform.select({ web: { boxShadow: '0px 2px 6px rgba(21, 34, 56, 0.03)' }, default: {} }) },
  searchInput: { flex: 1, minHeight: 48, color: theme.colors.textPrimary, fontSize: theme.typography.body },
  searchAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.sm },
  searchActionActive: { backgroundColor: theme.colors.accentSoft },
  filterButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceSecondary },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: theme.spacing.lg },
  sheetTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.section, lineHeight: 24, fontWeight: '800' },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -theme.spacing.sm },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, borderRadius: theme.radius.card, padding: theme.spacing.lg, marginTop: theme.spacing.md },
  banner_success: { backgroundColor: theme.colors.successSoft }, banner_info: { backgroundColor: theme.colors.infoSoft }, banner_warning: { backgroundColor: theme.colors.warningSoft }, banner_error: { backgroundColor: theme.colors.dangerSoft }, banner_unknown: { backgroundColor: theme.colors.surfaceSecondary },
  bannerCopy: { flex: 1 }, bannerTitle: { color: theme.colors.textPrimary, fontSize: 17, lineHeight: 22, fontWeight: '800' }, bannerBody: { color: theme.colors.textSecondary, lineHeight: 20, marginTop: 4 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xxxl, paddingHorizontal: theme.spacing.xl }, emptyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceSecondary, marginBottom: theme.spacing.md }, errorIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.dangerSoft, marginBottom: theme.spacing.md }, emptyTitle: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '700', textAlign: 'center' }, emptyBody: { color: theme.colors.textSecondary, lineHeight: 20, textAlign: 'center', marginTop: 6 }, textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.sm }, textButtonLabel: { color: theme.colors.accent, fontWeight: '700' }, loading: { alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.xxxl }, loadingText: { color: theme.colors.textSecondary }, primaryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.control, backgroundColor: theme.colors.accent, paddingHorizontal: theme.spacing.xl, marginTop: theme.spacing.lg }, primaryPressed: { backgroundColor: theme.colors.accentPressed }, primaryLabel: { color: theme.colors.onAccent, fontSize: theme.typography.button, fontWeight: '700' }, disabled: { opacity: 0.5 }, supportingText: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, lineHeight: 19, marginTop: theme.spacing.xs }, formField: { marginTop: theme.spacing.lg }, formLabel: { color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, fontWeight: '600', marginBottom: theme.spacing.sm }, formError: { color: theme.colors.danger, lineHeight: 20, marginTop: theme.spacing.sm }, settingsGroup: { marginTop: theme.spacing.md }, settingsRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md }, settingsCopy: { flex: 1, minWidth: 0 }
});
