import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountingIssue, Invoice } from '../model/accounting';
import { issuePresentation } from '../presentation/accounting';
import { resolveIssueAction } from '../presentation/issueResolution';
import { t } from '../i18n';
import { theme } from '../theme/theme';
import { SheetHeader } from './ui';

export function IssueDetailsModal({ issue, documents, onClose, onDocument }: { issue: AccountingIssue | null; documents: Invoice[]; onClose: () => void; onDocument: (document: Invoice) => void }) {
  if (!issue) return null;
  const presentation = issuePresentation(issue);
  const action = resolveIssueAction(issue, documents);
  const canOpenInvoice = presentation.status !== 'informational' && action.kind === 'SUPPORTED_NAVIGATION';
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.overlay}><View style={styles.sheet}><SheetHeader title={t('home.issueDetails')} onClose={onClose} back /><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>{presentation.title}</Text><Text style={styles.body}>{presentation.body}</Text>{action.kind === 'UNKNOWN' ? <Text style={styles.notice}>{t('home.actionUnavailable')}</Text> : null}{canOpenInvoice ? <Pressable onPress={() => onDocument(action.invoice)} style={({ pressed }) => [styles.action, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t('home.checkDocument')}><Text style={styles.actionLabel}>{t('home.checkDocument')}</Text><Text style={styles.actionArrow}>›</Text></Pressable> : null}</ScrollView></View></SafeAreaView></Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  sheet: { maxHeight: '88%', backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl },
  content: { paddingBottom: theme.spacing.xl },
  title: { color: theme.colors.textPrimary, fontSize: theme.typography.section, lineHeight: 24, fontWeight: '800' },
  body: { color: theme.colors.textSecondary, fontSize: theme.typography.body, lineHeight: 24, marginTop: theme.spacing.md },
  notice: { color: theme.colors.textSecondary, lineHeight: 21, marginTop: theme.spacing.xl, padding: theme.spacing.lg, backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.control },
  action: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: theme.radius.control, backgroundColor: theme.colors.accent, paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.xl },
  actionLabel: { color: theme.colors.onAccent, fontSize: theme.typography.button, fontWeight: '700' },
  actionArrow: { color: theme.colors.onAccent, fontSize: 26 },
  pressed: { backgroundColor: theme.colors.accentPressed }
});
