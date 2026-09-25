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
  const { signIn, startDemo, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) return;
    setBusy(true);
    try { await signIn(email.trim(), password); }
    catch { /* context exposes the error */ }
    finally { setBusy(false); }
  }

  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}><Image source={require('../../assets/brand/app-icon.png')} style={styles.brandIcon} accessibilityLabel="Investory" /></View>
          <Text style={styles.title}>{t('auth.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
        </View>
        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.email')}</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" style={styles.input} placeholder={t('auth.emailPlaceholder')} placeholderTextColor={theme.colors.textMuted} accessibilityLabel={t('auth.email')} />
          <Text style={styles.label}>{t('auth.password')}</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" style={styles.input} placeholder={t('auth.password')} placeholderTextColor={theme.colors.textMuted} accessibilityLabel={t('auth.password')} />
          {error ? <Text style={styles.error} accessibilityRole="alert">{t(`auth.errors.${error}`)}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={busy ? t('auth.signingIn') : t('auth.signIn')} style={({ pressed }) => [styles.button, (!email.trim() || !password || busy) && styles.disabled, pressed && styles.pressed]} disabled={!email.trim() || !password || busy} onPress={submit}>
            {busy ? <ActivityIndicator color={theme.colors.onAccent} /> : <Text style={styles.buttonText}>{t('auth.signIn')}</Text>}
          </Pressable>
          <View style={styles.separator}><View style={styles.separatorLine} /><Text style={styles.separatorText}>{t('auth.or')}</Text><View style={styles.separatorLine} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('auth.tryDemo')} disabled={busy} onPress={() => { setBusy(true); void startDemo().catch(() => undefined).finally(() => setBusy(false)); }} style={({ pressed }) => [styles.demoButton, pressed && styles.pressed, busy && styles.disabled]}>
            <Ionicons name="eye-outline" size={19} color={theme.colors.primary} /><Text style={styles.demoButtonText}>{t('auth.tryDemo')}</Text>
          </Pressable>
          <Text style={styles.demoNote}>{t('auth.demoNote')}</Text>
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
  separator: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.xl },
  separatorLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.borderSubtle },
  separatorText: { color: theme.colors.textMuted, fontSize: 13 },
  demoButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.control, marginTop: theme.spacing.lg },
  demoButtonText: { color: theme.colors.primary, fontSize: 16, fontWeight: '700' },
  demoNote: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: theme.spacing.sm },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  buttonText: { color: theme.colors.onAccent, fontSize: 16, fontWeight: '800' },
  note: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: theme.spacing.xl }
});
