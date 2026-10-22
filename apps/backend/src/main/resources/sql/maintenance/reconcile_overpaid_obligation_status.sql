UPDATE ryczalt.ryczalt_obligation obligation
SET status = 'OVERPAID',
    updated_at = CURRENT_TIMESTAMP
WHERE obligation.status = 'PAID'
  AND (
      COALESCE((
          SELECT SUM(payment_match.matched_amount)
          FROM ryczalt.ryczalt_payment_match payment_match
          WHERE payment_match.profile_id = obligation.profile_id
            AND payment_match.obligation_id = obligation.id
      ), 0)
      + CASE
            WHEN obligation.manual_paid_date IS NOT NULL THEN obligation.amount
            ELSE 0
        END
  ) > obligation.amount;
