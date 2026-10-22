-- Caller supplies verified_invoice_fx as a transaction-local table populated from NBP.
-- Amounts, approvals and calculation history are deliberately excluded from this update.
WITH updated AS (
    UPDATE ryczalt.ryczalt_invoice i
    SET fx_rate = v.rate,
        fx_effective_date = v.effective_date,
        fx_provider = 'NBP',
        fx_provider_reference = v.provider_reference,
        updated_at = CURRENT_TIMESTAMP
    FROM verified_invoice_fx v, ryczalt.ryczalt_period p
    WHERE i.profile_id = v.profile_id AND i.id = v.invoice_id
      AND p.profile_id = i.profile_id AND p.id = i.period_id AND p.status <> 'FROZEN'
      AND i.currency = v.currency AND i.currency <> 'PLN'
      AND i.direction = 'INCOME' AND i.approval_status = 'APPROVED'
      AND i.fx_rate IS NULL AND i.fx_effective_date IS NULL
      AND i.fx_provider IS NULL AND i.fx_provider_reference IS NULL
      AND v.rate > 0 AND i.net_amount > 0
      AND v.requested_date = i.accounting_date - CASE EXTRACT(DOW FROM i.accounting_date)
            WHEN 1 THEN 3 WHEN 0 THEN 2 ELSE 1 END
      AND v.effective_date <= v.requested_date
      AND v.effective_date > v.requested_date - 7
      AND round(i.net_amount * v.rate, 2) = i.booked_net_pln
      AND (i.booked_vat_pln IS NULL AND i.vat_amount = 0
           OR round(i.vat_amount * v.rate, 2) = i.booked_vat_pln)
    RETURNING i.profile_id, i.period_id, i.id, i.fx_effective_date, i.fx_provider_reference
)
INSERT INTO ryczalt.ryczalt_audit_event
    (profile_id, period_id, event_type, reason, actor, metadata)
SELECT profile_id, period_id, 'INVOICE_FX_BACKFILLED',
       'Historical NBP observation independently verified; booked amounts match unchanged',
       'verified-fx-maintenance',
       jsonb_build_object('invoiceId', id, 'effectiveDate', fx_effective_date,
                          'providerReference', fx_provider_reference)
FROM updated
RETURNING id;
