import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AccountingIssue, AccountingLine } from '../model/accounting';
import { issuePresentation } from '../presentation/accounting';
import { resolveIssueAction } from '../presentation/issueResolution';
import { t } from '../i18n';
import { theme } from '../theme/theme';

export function IssueDetailsModal({ issue, documents, onClose, onDocument }: { issue: AccountingIssue | null; documents: AccountingLine[]; onClose: () => void; onDocument: (document: AccountingLine) => void }) {
  if (!issue) return null;
  const presentation = issuePresentation(issue);
  const action = resolveIssueAction(issue, documents);
  const canOpenDocument = presentation.status !== 'informational' && action.kind === 'SUPPORTED_NAVIGATION';
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.overlay}><View style={styles.sheet}><View style={styles.header}><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={10} style={styles.back}><Ionicons name="chevron-back" size={25} color={theme.colors.textPrimary} /></Pressable><Text style={styles.headerTitle}>{t('home.issueDetails')}</Text><View style={styles.spacer} /></View><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>{presentation.title}</Text><Text style={styles.body}>{presentation.body}</Text>{action.kind === 'DISPLAY_ONLY' && (issue.resolution.type ?? '').toUpperCase() !== 'NONE' ? <Text style={styles.notice}>{t('home.actionUnavailable')}</Text> : null}{action.kind === 'BACKEND_COMMAND_NOT_EXPOSED' || action.kind === 'UNKNOWN' ? <Text style={styles.notice}>{t('home.actionUnavailable')}</Text> : null}{canOpenDocument ? <Pressable onPress={() => onDocument(action.document)} style={({ pressed }) => [styles.action, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t('home.checkDocument')}><Text style={styles.actionLabel}>{t('home.checkDocument')}</Text><Ionicons name="chevron-forward" size={19} color={theme.colors.onAccent} /></Pressable> : null}</ScrollView></View></SafeAreaView></Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  sheet: { maxHeight: '88%', backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.xl },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  spacer: { width: 34 },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800' },
  content: { paddingBottom: theme.spacing.xl },
  title: { color: theme.colors.textPrimary, fontSize: 25, lineHeight: 31, fontWeight: '800' },
  body: { color: theme.colors.textSecondary, fontSize: 16, lineHeight: 24, marginTop: theme.spacing.md },
  notice: { color: theme.colors.textSecondary, lineHeight: 21, marginTop: theme.spacing.xl, padding: theme.spacing.lg, backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.control },
  action: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: theme.radius.control, backgroundColor: theme.colors.accent, paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.xl },
  actionLabel: { color: theme.colors.onAccent, fontSize: 16, fontWeight: '800' },
  pressed: { backgroundColor: theme.colors.accentPressed }
});
