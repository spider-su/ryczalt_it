import * as React from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAccountingMonth } from "../navigation/AccountingMonthContext";
import { createAccountingRepository } from "../api/config";
import type { AccountingExportKind } from "../data/accountingRepository";
import { formatMonth, t } from "../i18n";
import { useLocale } from "../i18n/LocaleContext";
import { createThemeStyles, theme, useTheme } from "../theme/theme";
import {
  ListGroup,
  ListRow,
  LoadingState,
  SheetHeader,
  SupportingText,
} from "../components/ui";
import { saveAndShareAccountingExport } from "../utils/accountingExport";

export function AccountingExportsScreen({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  useTheme();
  useLocale();
  const { month } = useAccountingMonth();
  const repository = React.useMemo(() => createAccountingRepository(), []);
  const [busy, setBusy] = React.useState<AccountingExportKind | null>(null);
  const [error, setError] = React.useState<AccountingExportKind | null>(null);

  React.useEffect(() => {
    if (!visible) {
      setBusy(null);
      setError(null);
    }
  }, [visible]);

  async function exportDocument(kind: AccountingExportKind): Promise<void> {
    setBusy(kind);
    setError(null);
    try {
      await saveAndShareAccountingExport(
        await repository.downloadExport(month, kind),
      );
    } catch {
      setError(kind);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <SheetHeader title={t("exports.title")} onClose={onClose} />
          <ScrollView contentContainerStyle={styles.content}>
            <SupportingText>{t("exports.description")}</SupportingText>
            <Text style={styles.period}>{formatMonth(month)}</Text>
            {busy ? (
              <LoadingState />
            ) : (
              <ListGroup>
                <ListRow
                  icon="document-text-outline"
                  title={t("exports.jpk")}
                  subtitle={t("exports.jpkHint")}
                  onPress={() => {
                    void exportDocument("JPK");
                  }}
                />
                <ListRow
                  icon="shield-checkmark-outline"
                  title={t("exports.zusDra")}
                  subtitle={t("exports.zusDraHint")}
                  onPress={() => {
                    void exportDocument("ZUS_DRA");
                  }}
                  last
                />
              </ListGroup>
            )}
            {error ? (
              <View style={styles.error}>
                <Ionicons
                  name="alert-circle-outline"
                  size={22}
                  color={theme.colors.danger}
                />
                <Text style={styles.errorText}>{t("exports.error")}</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = createThemeStyles({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    maxHeight: "80%",
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.large,
    borderTopRightRadius: theme.radius.large,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
  },
  content: { gap: theme.spacing.md },
  period: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.section,
    fontWeight: "800",
  },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.dangerSoft,
  },
  errorText: { flex: 1, color: theme.colors.danger, lineHeight: 20 },
});
