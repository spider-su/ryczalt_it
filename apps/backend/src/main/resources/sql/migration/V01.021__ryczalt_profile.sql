CREATE TABLE ryczalt.ryczalt_profile (
    id BIGSERIAL PRIMARY KEY,
    profile_id BIGINT NOT NULL UNIQUE REFERENCES ryczalt.portfolios(id) ON DELETE CASCADE,
    has_uop BOOLEAN NOT NULL DEFAULT TRUE,
    nip VARCHAR(10),
    full_name VARCHAR(240),
    tax_office_code VARCHAR(4),
    email VARCHAR(255),
    vat_payment_account VARCHAR(34),
    ryczalt_payment_account VARCHAR(34),
    zus_payment_account VARCHAR(34),
    first_name VARCHAR(120),
    surname VARCHAR(120),
    date_of_birth DATE,
    auto_approve_known_counterparties BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ryczalt.ryczalt_profile IS
    'Profile-scoped taxpayer identity and payment configuration for Ryczalt accounting.';
