import { t } from '../i18n';
import { AccountingStatus } from '../model/accounting';
import { filingStatusView, jpkStatusView, lifecycleStatusView, reconciliationStatusView, upoStatusView } from '../presentation/accountingStatus';
import { ListGroup, KeyValueRow, Section } from './ui';

export function AccountingStatusSection({ status }: { status: AccountingStatus | null }) {
  if (!status) return null;
  const filing = filingStatusView(status.filingSummary);
  const reconciliation = reconciliationStatusView(status.reconciliationSummary);
  const jpk = jpkStatusView(status.filingSummary.jpkStatus);
  const upo = upoStatusView(status.filingSummary.upoStatus);
  const lifecycle = lifecycleStatusView(status.lifecycle);
  return <Section title={t('settlements.accountingStatus')} tone="secondary"><ListGroup><KeyValueRow label={t('settlements.lifecycle')} value={t(lifecycle.labelKey)} state={lifecycle.state} /><KeyValueRow label={t('settlements.filing')} value={t(filing.labelKey)} state={filing.state} /><KeyValueRow label={t('settlements.jpk')} value={t(jpk.labelKey)} state={jpk.state} /><KeyValueRow label={t('settlements.upo')} value={t(upo.labelKey)} state={upo.state} /><KeyValueRow label={t('settlements.reconciliation')} value={t(reconciliation.labelKey)} state={reconciliation.state} /></ListGroup></Section>;
}
