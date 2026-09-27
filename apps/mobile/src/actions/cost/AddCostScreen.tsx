import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import {
  ACCOUNTING_DATA_SOURCE,
  createAccountingApi,
  isDemoMode,
  requireAccountingProfileId,
} from "../../api/config";
import type { InvoiceCandidateDto } from "../../api/dto/accounting";
import {
  costInputLabel,
  costOptionLabel,
  formatCurrency,
  formatDate,
  t,
} from "../../i18n";
import {
  isRequiredInputActive,
  invoiceFromCandidate,
  mapCostError,
  mapCostMutation,
  mapRecognizedCost,
  missingRequiredInput,
  normalizeManualDecimal,
  validateManualCostDraft,
  type CostErrorState,
  type CostReview,
  type ManualCostDraft,
  type ManualCostDraftError,
} from "../../presentation/costPresentation";
import { useAccountingMonth } from "../../navigation/AccountingMonthContext";
import { createThemeStyles, theme } from "../../theme/theme";
import { useLocale } from "../../i18n/LocaleContext";
import { recognitionWithRequiredInputs } from "../../data/mocks/canonicalAccounting";
import {
  addDemoCost,
  addDemoManualCost,
} from "../../data/mockAccountingRepository";

type FileValue = { uri: string; name: string; type: string };

export function AddCostScreen({
  onBack,
  initialMode = "file",
}: {
  onBack: () => void;
  initialMode?: "file" | "manual";
}) {
  useLocale();
  const api = useMemo(() => {
    try {
      return createAccountingApi();
    } catch {
      return null;
    }
  }, []);
  const { refreshAccounting } = useAccountingMonth();
  const [file, setFile] = useState<FileValue | null>(null);
  const [review, setReview] = useState<CostReview | null>(null);
  const [vatTreatment, setVatTreatment] = useState<string | null>(null);
  const [vatRate, setVatRate] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<
    CostErrorState | "no_document" | "unsupported" | null
  >(null);
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState("cost.saved");
  const [duplicate, setDuplicate] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualError, setManualError] = useState<ManualCostDraftError | null>(
    null,
  );
  const manualMockEnabled = isDemoMode() || ACCOUNTING_DATA_SOURCE === "mock";
  const [manualDraft, setManualDraft] = useState<ManualCostDraft>({
    counterparty: "",
    taxIdentifier: "",
    reference: "",
    issueDate: "",
    dueDate: "",
    currency: "PLN",
    netAmount: "",
    vatAmount: "",
    grossAmount: "",
  });
  useEffect(() => {
    if (initialMode === "manual") setManualMode(true);
  }, [initialMode]);
  function updateManual(field: keyof ManualCostDraft, value: string) {
    setManualDraft((current) => ({
      ...current,
      [field]: field === "currency" ? value.toUpperCase().slice(0, 3) : value,
    }));
    setManualError(null);
  }
  function showManual() {
    setManualMode(true);
    setFile(null);
    setReview(null);
    setError(null);
    setManualError(null);
  }
  async function pick() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setFile({
        uri: asset.uri,
        name: asset.name || "document",
        type: asset.mimeType || "application/octet-stream",
      });
      setManualMode(false);
      setReview(null);
      setError(null);
      setDuplicate(false);
    } catch (reason) {
      setError(mapCostError(reason));
    }
  }
  async function recognize() {
    if (busy) return;
    if (!file) return setError("no_document");
    if (!api && !isDemoMode()) return setError("unavailable");
    setBusy(true);
    setError(null);
    try {
      const candidate = isDemoMode()
        ? {
            ...recognitionWithRequiredInputs,
            issueDate: "2026-07-15",
            periodYear: 2026,
            periodMonth: 7,
            reference: "DEMO/FV/001",
          }
        : await api!.recognizeInvoice(requireAccountingProfileId(), file);
      const next = mapRecognizedCost(candidate);
      setReview(next);
      setVatTreatment(null);
      setVatRate("");
      setCountry("");
      setError(next.state === "unsupported" ? "unsupported" : null);
    } catch (reason) {
      setError(mapCostError(reason));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (busy) return;
    if (
      !review ||
      review.state === "unsupported" ||
      review.state === "duplicate" ||
      (!api && !isDemoMode())
    )
      return setError("validation_required");
    const values = {
      classification: vatTreatment,
      paymentVerificationPolicy: null,
    };
    if (missingRequiredInput(review.requiredInputs, values))
      return setError("validation_required");
    const candidate: InvoiceCandidateDto = review.candidate;
    setBusy(true);
    setError(null);
    setDuplicate(false);
    try {
      if (isDemoMode()) addDemoCost(candidate, values.classification);
      else {
        const result = await api!.createInvoice(
          requireAccountingProfileId(),
          invoiceFromCandidate(candidate, values),
        );
        const mapped = mapCostMutation(result);
        if (mapped.state === "duplicate") {
          setDuplicate(true);
          return;
        }
        if (mapped.state !== "success") {
          setError("unknown_error");
          return;
        }
      }
      refreshAccounting();
      setDoneMessage("cost.saved");
      setDone(true);
    } catch (reason) {
      setError(mapCostError(reason));
    } finally {
      setBusy(false);
    }
  }
  function saveManual() {
    const validation = validateManualCostDraft(manualDraft);
    if (validation) {
      setManualError(validation);
      return;
    }
    if (!manualMockEnabled) return;
    addDemoManualCost({
      ...manualDraft,
      currency: manualDraft.currency.toUpperCase(),
      netAmount: normalizeManualDecimal(manualDraft.netAmount)!,
      vatAmount: normalizeManualDecimal(manualDraft.vatAmount)!,
      grossAmount: normalizeManualDecimal(manualDraft.grossAmount)!,
    });
    refreshAccounting();
    setDoneMessage("cost.manualSaved");
    setDone(true);
  }
  if (done)
    return (
      <Shell title={t("cost.title")} onBack={onBack}>
        <View style={styles.success}>
          <Ionicons
            name="checkmark-circle-outline"
            size={42}
            color={theme.colors.success}
          />
          <Text style={styles.successTitle}>{t(doneMessage)}</Text>
          <Button label={t("common.close")} onPress={onBack} />
        </View>
      </Shell>
    );
  return (
    <Shell title={t("cost.title")} onBack={onBack}>
      {manualMode ? (
        <>
          <View style={styles.extracted}>
            <Text style={styles.step}>{t("cost.manualTitle")}</Text>
            <Field
              label={t("invoices.counterparty")}
              value={manualDraft.counterparty}
              onChangeText={(v) => updateManual("counterparty", v)}
            />
            <Field
              label={t("cost.manualTaxIdentifier")}
              value={manualDraft.taxIdentifier}
              onChangeText={(v) => updateManual("taxIdentifier", v)}
            />
            <Field
              label={t("invoices.number")}
              value={manualDraft.reference}
              onChangeText={(v) => updateManual("reference", v)}
            />
            <Field
              label={t("invoices.issueDate")}
              value={manualDraft.issueDate}
              onChangeText={(v) => updateManual("issueDate", v)}
              placeholder="YYYY-MM-DD"
            />
            <Field
              label={t("settlements.dueDate")}
              value={manualDraft.dueDate}
              onChangeText={(v) => updateManual("dueDate", v)}
              placeholder="YYYY-MM-DD"
            />
            <Field
              label={t("invoices.currency")}
              value={manualDraft.currency}
              onChangeText={(v) => updateManual("currency", v)}
            />
            <Field
              label={t("cost.manualNetAmount")}
              value={manualDraft.netAmount}
              onChangeText={(v) => updateManual("netAmount", v)}
              keyboardType="decimal-pad"
            />
            <Field
              label={t("cost.manualVatAmount")}
              value={manualDraft.vatAmount}
              onChangeText={(v) => updateManual("vatAmount", v)}
              keyboardType="decimal-pad"
            />
            <Field
              label={t("cost.manualGrossAmount")}
              value={manualDraft.grossAmount}
              onChangeText={(v) => updateManual("grossAmount", v)}
              keyboardType="decimal-pad"
            />
            {manualError && (
              <Text style={styles.error} accessibilityRole="alert">
                {t(`cost.manualErrors.${manualError}`)}
              </Text>
            )}
            {!manualMockEnabled && (
              <Text style={styles.notice}>
                {t("cost.manualBackendPending")}
              </Text>
            )}
            <Button
              label={t("cost.manualSave")}
              onPress={saveManual}
              disabled={!manualMockEnabled}
            />
          </View>
          <Button label={t("cost.useFile")} onPress={pick} />
        </>
      ) : (
        <>
          <Pressable
            style={styles.upload}
            onPress={pick}
            accessibilityRole="button"
            accessibilityLabel={t("cost.chooseDocument")}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={30}
              color={theme.colors.primary}
            />
            <Text style={styles.uploadTitle}>
              {file?.name || t("cost.chooseDocument")}
            </Text>
            <Text style={styles.muted}>{t("cost.chooseDocumentHint")}</Text>
          </Pressable>
          {file && !review ? (
            <Button
              label={busy ? t("common.loading") : t("cost.recognize")}
              onPress={recognize}
              disabled={busy}
            />
          ) : null}
          {review ? (
            <Review
              review={review}
              duplicate={duplicate}
              vatTreatment={vatTreatment}
              vatRate={vatRate}
              country={country}
              onTreatment={setVatTreatment}
              onVatRate={setVatRate}
              onCountry={setCountry}
              onSave={save}
              busy={busy}
            />
          ) : null}
          {error && (
            <Text style={styles.error} accessibilityRole="alert">
              {errorText(error)}
            </Text>
          )}
          {manualMockEnabled ? <Button label={t("cost.enterManually")} onPress={showManual} /> : null}
        </>
      )}
    </Shell>
  );
}

function Review({
  review,
  duplicate,
  vatTreatment,
  vatRate,
  country,
  onTreatment,
  onVatRate,
  onCountry,
  onSave,
  busy,
}: {
  review: CostReview;
  duplicate: boolean;
  vatTreatment: string | null;
  vatRate: string;
  country: string;
  onTreatment: (value: string) => void;
  onVatRate: (value: string) => void;
  onCountry: (value: string) => void;
  onSave: () => void;
  busy: boolean;
}) {
  const inputValues: Record<string, string | null> = {
    classification: vatTreatment,
    vatTreatment,
    vatRate: vatRate.trim() || null,
    paymentVerificationPolicy: country.trim() || null,
    RYCZALT_RATE: vatRate.trim() || null,
  };
  const classificationInput = review.requiredInputs.find(
    (input) => input.field.toUpperCase() === "CLASSIFICATION",
  );
  const genericInputs = review.requiredInputs.filter(
    (input) => input !== classificationInput,
  );
  return (
    <View style={styles.extracted}>
      <Text style={styles.step}>{t("cost.recognized")}</Text>
      <Row
        label={t("invoices.counterparty")}
        value={review.supplier || t("common.unknown")}
      />
      <Row
        label={t("invoices.number")}
        value={review.documentNumber || t("common.unknown")}
      />
      <Row
        label={t("invoices.issueDate")}
        value={formatDate(review.issueDate)}
      />
      <Row
        label={t("invoices.currency")}
        value={review.currency || t("common.unknown")}
      />
      <Row
        label={t("invoice.total")}
        value={
          review.amount == null
            ? t("common.unknown")
            : formatCurrency(review.amount, review.currency)
        }
      />
      {review.state === "unsupported" ? (
        <Text style={styles.error}>{t("cost.unsupportedDirection")}</Text>
      ) : review.state === "duplicate" ? (
        <Text style={styles.notice}>{t("cost.duplicate")}</Text>
      ) : (
        <>
          {classificationInput && (
            <>
              <Text style={styles.label}>
                {costInputLabel(
                  classificationInput.field,
                  classificationInput.field,
                )}
              </Text>
              <View style={styles.options}>
                {classificationInput.options.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => onTreatment(option.value)}
                    style={[
                      styles.option,
                      vatTreatment === option.value && styles.optionSelected,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{
                      selected: vatTreatment === option.value,
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        vatTreatment === option.value &&
                          styles.optionSelectedText,
                      ]}
                    >
                      {costOptionLabel(option.value, option.labelKey)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
          {genericInputs.map((input) =>
            isRequiredInputActive(input, inputValues) ? (
              <Field
                key={input.field}
                label={costInputLabel(input.field, input.field)}
                value={inputValues[input.field] ?? ""}
                onChangeText={
                  input.field.toUpperCase() === "RYCZALT_RATE"
                    ? onVatRate
                    : onCountry
                }
                keyboardType={
                  input.inputType.toUpperCase() === "DECIMAL"
                    ? "decimal-pad"
                    : "default"
                }
              />
            ) : null,
          )}
          {review.requiredInputs.length === 0 ? (
            <Text style={styles.notice}>{t("cost.backendRequired")}</Text>
          ) : null}
          <Button
            label={busy ? t("common.loading") : t("cost.confirm")}
            onPress={onSave}
            disabled={busy}
          />
        </>
      )}
      {duplicate && <Text style={styles.notice}>{t("cost.duplicate")}</Text>}
    </View>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}
function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "decimal-pad";
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        style={styles.input}
        accessibilityLabel={label}
      />
    </View>
  );
}
function Shell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.form}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.spacer} />
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
function Button({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}
function errorText(
  error: CostErrorState | "no_document" | "unsupported",
): string {
  const key =
    error === "no_document"
      ? "cost.noDocument"
      : error === "unsupported"
        ? "cost.unsupportedDirection"
        : `cost.errors.${error}`;
  return t(key);
}
const styles = createThemeStyles({
  form: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 54,
    marginBottom: theme.spacing.xl,
  },
  title: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: "800" },
  spacer: { width: 28 },
  upload: {
    minHeight: 168,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: theme.colors.borderSubtle,
    borderStyle: "dashed",
    padding: theme.spacing.xl,
  },
  uploadTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  muted: { color: theme.colors.textSecondary, marginTop: 4 },
  button: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  buttonText: { color: theme.colors.onAccent, fontWeight: "800", fontSize: 16 },
  disabled: { opacity: 0.55 },
  error: {
    color: theme.colors.danger,
    lineHeight: 20,
    marginVertical: theme.spacing.md,
  },
  notice: {
    color: theme.colors.warning,
    lineHeight: 20,
    marginTop: theme.spacing.lg,
  },
  extracted: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  step: {
    color: theme.colors.textPrimary,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.borderSubtle,
    paddingVertical: theme.spacing.md,
  },
  value: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
    flex: 1,
    textAlign: "right",
  },
  field: { marginTop: theme.spacing.lg },
  label: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: theme.spacing.sm,
  },
  input: {
    minHeight: 54,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    paddingHorizontal: theme.spacing.lg,
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  options: { gap: theme.spacing.sm },
  option: {
    minHeight: 50,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radius.control,
    paddingHorizontal: theme.spacing.lg,
  },
  optionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  optionText: { color: theme.colors.textSecondary, fontWeight: "700" },
  optionSelectedText: { color: theme.colors.accent },
  success: { alignItems: "center", gap: theme.spacing.md, marginTop: 80 },
  successTitle: {
    color: theme.colors.textPrimary,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
});
