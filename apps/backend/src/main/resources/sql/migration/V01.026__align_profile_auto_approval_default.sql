-- Match the reviewed Neon schema: new profiles do not automatically approve
-- invoices from known counterparties by default.
ALTER TABLE ryczalt.ryczalt_profile
    ALTER COLUMN auto_approve_known_counterparties SET DEFAULT FALSE;
