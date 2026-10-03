ALTER TABLE ryczalt.ryczalt_native_month_input
    ALTER COLUMN ytd_ryczalt_revenue DROP NOT NULL;

ALTER TABLE ryczalt.ryczalt_native_month_input
    ADD COLUMN accounting_start_date DATE,
    ADD COLUMN opening_ytd_revenue NUMERIC(19,4),
    ADD COLUMN opening_social_contributions_paid NUMERIC(19,4),
    ADD COLUMN opening_health_contributions_paid NUMERIC(19,4),
    ADD COLUMN opening_deductions_consumed NUMERIC(19,4),
    ADD COLUMN opening_vat_carry_forward NUMERIC(19,4);

ALTER TABLE ryczalt.ryczalt_native_month_input
    ADD CONSTRAINT chk_ryczalt_native_month_opening_nonnegative CHECK (
        COALESCE(opening_ytd_revenue, 0) >= 0
        AND COALESCE(opening_social_contributions_paid, 0) >= 0
        AND COALESCE(opening_health_contributions_paid, 0) >= 0
        AND COALESCE(opening_deductions_consumed, 0) >= 0
        AND COALESCE(opening_vat_carry_forward, 0) >= 0
    ),
    ADD CONSTRAINT chk_ryczalt_native_month_opening_state_complete CHECK (
        (accounting_start_date IS NULL
            AND opening_ytd_revenue IS NULL
            AND opening_social_contributions_paid IS NULL
            AND opening_health_contributions_paid IS NULL
            AND opening_deductions_consumed IS NULL
            AND opening_vat_carry_forward IS NULL)
        OR
        (accounting_start_date IS NOT NULL
            AND opening_ytd_revenue IS NOT NULL
            AND opening_social_contributions_paid IS NOT NULL
            AND opening_health_contributions_paid IS NOT NULL
            AND opening_deductions_consumed IS NOT NULL
            AND opening_vat_carry_forward IS NOT NULL)
    );

CREATE INDEX ix_ryczalt_native_month_opening_start
    ON ryczalt.ryczalt_native_month_input(profile_id, accounting_start_date)
    WHERE accounting_start_date IS NOT NULL;

CREATE UNIQUE INDEX uq_ryczalt_native_month_accounting_start
    ON ryczalt.ryczalt_native_month_input(profile_id)
    WHERE accounting_start_date IS NOT NULL;

ALTER TABLE ryczalt.ryczalt_native_month_input
    ADD CONSTRAINT chk_ryczalt_native_month_opening_date_matches_period CHECK (
        accounting_start_date IS NULL OR
        (EXTRACT(YEAR FROM accounting_start_date) = tax_year
            AND EXTRACT(MONTH FROM accounting_start_date) = tax_month)
    );
