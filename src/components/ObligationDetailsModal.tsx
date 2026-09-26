import { useEffect, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Modal, Pressable, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Obligation } from "../model/accounting";
import {
  formatDate,
  formatMonth,
  paymentLabel,
  paymentStatusLabel,
  t,
} from "../i18n";
import { formatMoney } from "../utils/money";
import { createThemeStyles, theme } from "../theme/theme";
import { KeyValueRow, ListGroup, PrimaryButton, SheetHeader } from "./ui";
import { paymentStatusForDisplay } from "../presentation/accounting";
import { ApiError } from "../api/client";
import {
  paymentDetailsText,
  paymentInstructionFor,
} from "../presentation/paymentInstruction";

export function ObligationDetailsModal({
  item,
  busy,
  onClose,
  onMarkManuallyPaid,
}: {
  item: Obligation | null;
  busy: boolean;
  onClose: () => void;
  onMarkManuallyPaid: (obligation: Obligation) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  useEffect(() => {
    setConfirming(false);
    setError(false);
    setUncertain(false);
    setCopied(false);
    setShowQr(false);
  }, [item]);
  if (!item) return null;
  const selectedItem = item;

  const status = paymentStatusForDisplay(selectedItem);
  const payable = ["OPEN", "PARTIALLY_PAID", "OVERDUE"].includes(status);
  const instruction = paymentInstructionFor(selectedItem);
  async function confirmPayment() {
    setError(false);
    setUncertain(false);
    try {
      await onMarkManuallyPaid(item!);
      onClose();
    } catch (reason) {
      setError(true);
      setUncertain(reason instanceof ApiError && reason.kind === "timeout");
    }
  }

  async function copyDetails() {
    if (!instruction) return;
    await Clipboard.setStringAsync(
      paymentDetailsText(selectedItem, instruction),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <>
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.overlay}>
          <View style={styles.sheet}>
            <SheetHeader title={paymentLabel(item.title)} onClose={onClose} />
            <Text style={styles.amount}>{formatMoney(item.amount)}</Text>
            <ListGroup>
              <KeyValueRow
                label={t("settlements.period")}
                value={formatMonth(item.period)}
              />
              <KeyValueRow
                label={t("settlements.dueDate")}
                value={
                  item.dueDate
                    ? formatDate(item.dueDate)
                    : t("settlements.dueDateUnavailable")
                }
              />
              <KeyValueRow
                label={t("settlements.amount")}
                value={formatMoney(item.amount)}
              />
              <KeyValueRow
                label={t("settlements.paidAmount")}
                value={formatMoney(item.paidAmount)}
              />
              <KeyValueRow
                label={t("settlements.remaining")}
                value={formatMoney(item.outstandingAmount)}
              />
              <KeyValueRow
                label={t("settlements.status")}
                value={paymentStatusLabel(status)}
              />
            </ListGroup>
            {payable && instruction ? (
              <View style={styles.paymentActions}>
                <Text style={styles.paymentActionsTitle}>
                  {t("settlements.payThisObligation")}
                </Text>
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void copyDetails();
                    }}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryText}>
                      {t("settlements.copyPaymentDetails")}
                    </Text>
                  </Pressable>
                  {instruction.qrPayload ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setShowQr(true)}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryText}>
                        {t("settlements.showPaymentQr")}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                {copied ? (
                  <Text style={styles.copied}>
                    {t("settlements.paymentDetailsCopied")}
                  </Text>
                ) : null}
                {!instruction.qrPayload ? (
                  <Text style={styles.qrUnavailable}>
                    {t("settlements.paymentQrUnavailable")}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {payable ? (
              confirming ? (
                <View style={styles.confirmBox}>
                  <Text style={styles.confirmCopy}>
                    {t("settlements.manualPaidConfirmation")}
                  </Text>
                  {error ? (
                    <Text style={styles.error}>
                      {t(
                        uncertain
                          ? "settlements.manualPaidUncertain"
                          : "settlements.manualPaidFailure",
                      )}
                    </Text>
                  ) : null}
                  <View style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={() => setConfirming(false)}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelText}>
                        {t("common.cancel")}
                      </Text>
                    </Pressable>
                    <View style={styles.confirmButton}>
                      <PrimaryButton
                        label={
                          busy
                            ? t("common.loading")
                            : t("settlements.confirmManualPaid")
                        }
                        onPress={() => {
                          void confirmPayment();
                        }}
                        disabled={busy}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <PrimaryButton
                  label={t("settlements.markPaidManually")}
                  onPress={() => {
                    setError(false);
                    setConfirming(true);
                  }}
                />
              )
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>
      {instruction?.qrPayload ? (
        <Modal
          visible={showQr}
          transparent
          animationType="fade"
          onRequestClose={() => setShowQr(false)}
        >
          <SafeAreaView style={styles.qrOverlay}>
            <View style={styles.qrSheet}>
              <SheetHeader
                title={t("settlements.paymentQrTitle")}
                onClose={() => setShowQr(false)}
              />
              <View style={styles.qrCode}>
                <QRCode
                  value={instruction.qrPayload}
                  size={220}
                  backgroundColor={theme.colors.surface}
                  color={theme.colors.textPrimary}
                />
              </View>
              <Text style={styles.qrHint}>
                {t("settlements.paymentQrHint")}
              </Text>
              <ListGroup>
                <KeyValueRow
                  label={t("settlements.recipient")}
                  value={instruction.recipientName}
                />
                <KeyValueRow
                  label={t("settlements.amount")}
                  value={formatMoney(instruction.amount)}
                />
                <KeyValueRow
                  label={t("settlements.titleLabel")}
                  value={instruction.title}
                />
              </ListGroup>
              <Text style={styles.qrWarning}>
                {t("settlements.verifyPaymentDetails")}
              </Text>
            </View>
          </SafeAreaView>
        </Modal>
      ) : null}
    </>
  );
}

const styles = createThemeStyles({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.large,
    borderTopRightRadius: theme.radius.large,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  amount: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.amount,
    fontWeight: "800",
  },
  confirmBox: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  confirmCopy: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.supporting,
    lineHeight: 20,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.supporting,
    marginTop: theme.spacing.sm,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  cancelButton: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
  },
  cancelText: { color: theme.colors.textSecondary, fontWeight: "700" },
  confirmButton: { minWidth: 150 },
  paymentActions: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.surfaceSecondary,
    gap: theme.spacing.sm,
  },
  paymentActionsTitle: { color: theme.colors.textPrimary, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: theme.spacing.sm },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    paddingHorizontal: theme.spacing.sm,
  },
  secondaryText: {
    color: theme.colors.accent,
    fontSize: theme.typography.supporting,
    fontWeight: "700",
    textAlign: "center",
  },
  copied: {
    color: theme.colors.success,
    fontSize: theme.typography.supporting,
  },
  qrUnavailable: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.caption,
  },
  qrOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.overlay,
  },
  qrSheet: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.large,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  qrCode: {
    alignItems: "center",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  qrHint: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
  },
  qrWarning: {
    color: theme.colors.warning,
    fontSize: theme.typography.supporting,
    lineHeight: 19,
    textAlign: "center",
  },
});
