import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useAutoApproval } from '../settings/AutoApprovalContext';
import { useAuth } from '../auth/AuthContext';

export function MoreScreen() {
  const { settings, ready, update } = useAutoApproval();
  const { signOut } = useAuth();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [draft, setDraft] = useState(settings);

  useEffect(() => setDraft(settings), [settings]);
  async function save() { await update(draft); setSettingsVisible(false); }
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>More</Text>

        <View style={styles.card}>
          <MenuRow icon="person-outline" title="Profile" />
          <Pressable style={styles.row} onPress={() => setSettingsVisible(true)} disabled={!ready} accessibilityRole="button"><Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.primary} /><Text style={styles.rowText}>Auto-approval</Text><Text style={styles.status}>{settings.enabled ? 'On' : 'Off'}</Text><Ionicons name="chevron-forward" size={19} color={theme.colors.textMuted} /></Pressable>
          <MenuRow icon="refresh-outline" title="Refresh data" divider />
          <Pressable style={[styles.row, styles.divider]} onPress={signOut} accessibilityRole="button"><Ionicons name="log-out-outline" size={22} color={theme.colors.danger} /><Text style={styles.rowText}>Sign out</Text></Pressable>
          <MenuRow icon="information-circle-outline" title="About" divider />
        </View>
      </View>
      <Modal visible={settingsVisible} transparent animationType="slide" onRequestClose={() => setSettingsVisible(false)}><View style={styles.overlay}><View style={styles.sheet}><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Auto-approval</Text><Pressable onPress={() => setSettingsVisible(false)} accessibilityLabel="Close"><Ionicons name="close" size={24} color={theme.colors.text} /></Pressable></View><Text style={styles.description}>Automatically approve eligible documents only after backend write access and authentication are enabled.</Text><View style={styles.settingRow}><View style={styles.settingCopy}><Text style={styles.settingTitle}>Enable auto-approval</Text><Text style={styles.settingHint}>Currently stored on this device</Text></View><Switch value={draft.enabled} onValueChange={(enabled) => setDraft({ ...draft, enabled })} trackColor={{ false: theme.colors.border, true: theme.colors.primarySoft }} thumbColor={draft.enabled ? theme.colors.primary : theme.colors.textMuted} /></View><Text style={styles.label}>Maximum document amount (PLN)</Text><TextInput value={draft.maxAmount} onChangeText={(maxAmount) => setDraft({ ...draft, maxAmount: maxAmount.replace(/[^0-9.,]/g, '') })} keyboardType="decimal-pad" style={styles.input} placeholder="0" placeholderTextColor={theme.colors.textMuted} /><Text style={styles.warning}>This preference is not sent to the accounting backend yet. No document can be approved from this build.</Text><Pressable style={styles.saveButton} onPress={save}><Text style={styles.saveText}>Save settings</Text></Pressable></View></View></Modal>
    </SafeAreaView>
  );
}

function MenuRow({
  icon,
  title,
  divider
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  divider?: boolean;
}) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <Ionicons name={icon} size={22} color={theme.colors.primary} />
      <Text style={styles.rowText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  title: { fontSize: 32, fontWeight: '900', color: theme.colors.text, marginVertical: 12 },
  card: {
    overflow: 'hidden',
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text
  }
  ,status: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' }, overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000055' }, sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, gap: 12 }, sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sheetTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '900' }, description: { color: theme.colors.textMuted, lineHeight: 20 }, settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }, settingCopy: { flex: 1 }, settingTitle: { color: theme.colors.text, fontWeight: '800' }, settingHint: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 }, label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' }, input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 11, color: theme.colors.text, fontSize: 16 }, warning: { color: theme.colors.warning, fontSize: 12, lineHeight: 18 }, saveButton: { alignItems: 'center', borderRadius: 999, backgroundColor: theme.colors.primary, paddingVertical: 12 }, saveText: { color: '#fff', fontWeight: '800' }
});
