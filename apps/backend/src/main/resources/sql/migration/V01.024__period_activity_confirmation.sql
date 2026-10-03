ALTER TABLE ryczalt.ryczalt_period
    ADD COLUMN activity_confirmation_type VARCHAR(32),
    ADD COLUMN activity_confirmed_at TIMESTAMPTZ,
    ADD COLUMN activity_confirmed_by VARCHAR(255),
    ADD CONSTRAINT chk_ryczalt_period_activity_confirmation CHECK (
        (activity_confirmation_type IS NULL
            AND activity_confirmed_at IS NULL
            AND activity_confirmed_by IS NULL)
        OR
        (activity_confirmation_type = 'NO_REVENUE'
            AND activity_confirmed_at IS NOT NULL
            AND activity_confirmed_by IS NOT NULL)
    );
