import { StatusBanner } from "./ui";
import { t } from "../i18n";

export type PaymentFeedbackState = {
  outcome: "success" | "failure" | "uncertain";
  refresh: "success" | "failed" | "pending" | "not_started";
};

export function PaymentFeedback({
  state,
  onDismiss,
  onRefresh,
}: {
  state: PaymentFeedbackState;
  onDismiss: () => void;
  onRefresh: () => void;
}) {
  const refreshFailed = state.refresh === "failed";
  const uncertain = state.outcome === "uncertain";
  const failed = state.outcome === "failure";
  const kind = failed
    ? "error"
    : uncertain || refreshFailed
      ? "warning"
      : "success";
  const title = failed
    ? "settlements.manualPaidFailure"
    : uncertain
      ? "settlements.manualPaidUncertain"
      : refreshFailed
        ? "settlements.manualPaidRecordedRefreshFailed"
        : "settlements.manualPaidSuccess";
  const body =
    uncertain && state.refresh === "pending"
      ? "settlements.manualPaidRefresh"
      : refreshFailed
        ? "settlements.manualPaidRefreshFailed"
        : failed
          ? "settlements.manualPaidFailureBody"
          : "settlements.manualPaidRefresh";
  return (
    <StatusBanner
      kind={kind}
      title={t(title)}
      body={t(body)}
      onDismiss={onDismiss}
      actionLabel={
        state.refresh !== "success" && !failed ? t("common.retry") : undefined
      }
      onAction={state.refresh !== "success" && !failed ? onRefresh : undefined}
    />
  );
}

