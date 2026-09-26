import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { t } from '../i18n';
import { createThemeStyles, theme, useTheme } from '../theme/theme';
import { useLocale } from '../i18n/LocaleContext';

export function AuthScreen() {
  useTheme();
  useLocale();
  const { signIn, activateAccount, startDemo, unlockWithBiometrics, biometricAvailable, biometricEnabled, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [invitationToken, setInvitationToken] = useState('');
  const [activationMode, setActivationMode] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password || (activationMode && (!invitationToken.trim() || password !== confirmation))) return;
    setBusy(true);
    try {
      if (activationMode) { await activateAccount(invitationToken.trim(), password); setActivationMode(false); setConfirmation(''); }
      await signIn(email.trim(), password);
    }
    catch { /* context exposes the error */ }
    finally { setBusy(false); }
  }

  async function unlock() { setBusy(true); try { await unlockWithBiometrics(); } finally { setBusy(false); } }

  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}><Image source={require('../../assets/brand/app-icon.png')} style={styles.brandIcon} accessibilityLabel="Investory" /></View>
          <Text style={styles.title}>{t('auth.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
        </View>
        <View style={styles.form}>
          {biometricAvailable && biometricEnabled ? <Pressable accessibilityRole="button" accessibilityLabel={t('auth.useBiometric')} disabled={busy} onPress={unlock} style={({ pressed }) => [styles.biometricButton, pressed && styles.pressed, busy && styles.disabled]}><Ionicons name="finger-print-outline" size={23} color={theme.colors.primary} /><Text style={styles.demoButtonText}>{t('auth.useBiometric')}</Text></Pressable> : null}
          <Text style={styles.label}>{t('auth.email')}</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" style={styles.input} placeholder={t('auth.emailPlaceholder')} placeholderTextColor={theme.colors.textMuted} accessibilityLabel={t('auth.email')} />
          {activationMode ? <><Text style={styles.label}>{t('auth.invitationToken')}</Text><TextInput value={invitationToken} onChangeText={setInvitationToken} autoCapitalize="none" autoCorrect={false} style={styles.input} placeholder={t('auth.invitationTokenPlaceholder')} placeholderTextColor={theme.colors.textMuted} accessibilityLabel={t('auth.invitationToken')} /></> : null}
          <Text style={styles.label}>{t('auth.password')}</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" style={styles.input} placeholder={t('auth.password')} placeholderTextColor={theme.colors.textMuted} accessibilityLabel={t('auth.password')} />
          {activationMode ? <><Text style={styles.label}>{t('auth.confirmPassword')}</Text><TextInput value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="password" style={styles.input} placeholder={t('auth.confirmPassword')} placeholderTextColor={theme.colors.textMuted} accessibilityLabel={t('auth.confirmPassword')} /></> : null}
          {error ? <Text style={styles.error} accessibilityRole="alert">{t(`auth.errors.${error}`)}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={busy ? t('auth.signingIn') : activationMode ? t('auth.activate') : t('auth.signIn')} style={({ pressed }) => [styles.button, (!email.trim() || !password || (activationMode && (!invitationToken.trim() || password !== confirmation)) || busy) && styles.disabled, pressed && styles.pressed]} disabled={!email.trim() || !password || (activationMode && (!invitationToken.trim() || password !== confirmation)) || busy} onPress={submit}>
            {busy ? <ActivityIndicator color={theme.colors.onAccent} /> : <Text style={styles.buttonText}>{activationMode ? t('auth.activate') : t('auth.signIn')}</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setActivationMode((value) => !value); setPassword(''); setConfirmation(''); setInvitationToken(''); }} style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}><Text style={styles.linkText}>{activationMode ? t('auth.backToSignIn') : t('auth.activateInvitation')}</Text></Pressable>
          {!activationMode ? <><View style={styles.separator}><View style={styles.separatorLine} /><Text style={styles.separatorText}>{t('auth.or')}</Text><View style={styles.separatorLine} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('auth.tryDemo')} disabled={busy} onPress={() => { setBusy(true); void startDemo().catch(() => undefined).finally(() => setBusy(false)); }} style={({ pressed }) => [styles.demoButton, pressed && styles.pressed, busy && styles.disabled]}>
            <Ionicons name="eye-outline" size={19} color={theme.colors.primary} /><Text style={styles.demoButtonText}>{t('auth.tryDemo')}</Text>
          </Pressable>
          <Text style={styles.demoNote}>{t('auth.demoNote')}</Text></> : null}
        </View>
        <Text style={styles.note}>{t('auth.secureNote')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = createThemeStyles({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.xl },
  brand: { alignItems: 'center', marginBottom: theme.spacing.xxl },
  logo: { width: 64, height: 64, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentSoft, marginBottom: theme.spacing.lg },
  brandIcon: { width: 64, height: 64 },
  title: { color: theme.colors.textPrimary, fontSize: 27, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 21, marginTop: theme.spacing.sm },
  form: { width: '100%' },
  label: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: theme.spacing.lg },
  input: { minHeight: 54, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.control, paddingHorizontal: theme.spacing.lg, color: theme.colors.textPrimary, fontSize: 16 },
  error: { color: theme.colors.danger, lineHeight: 20, marginTop: theme.spacing.md },
  button: { minHeight: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent, borderRadius: theme.radius.control, paddingVertical: theme.spacing.md, marginTop: theme.spacing.xl },
  biometricButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.control, marginBottom: theme.spacing.lg },
  separator: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.xl },
  separatorLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.borderSubtle },
  separatorText: { color: theme.colors.textMuted, fontSize: 13 },
  demoButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.control, marginTop: theme.spacing.lg },
  demoButtonText: { color: theme.colors.primary, fontSize: 16, fontWeight: '700' },
  linkButton: { alignItems: 'center', paddingVertical: theme.spacing.lg },
  linkText: { color: theme.colors.primary, fontWeight: '700' },
  demoNote: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: theme.spacing.sm },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  buttonText: { color: theme.colors.onAccent, fontSize: 16, fontWeight: '800' },
  note: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: theme.spacing.xl }
});
