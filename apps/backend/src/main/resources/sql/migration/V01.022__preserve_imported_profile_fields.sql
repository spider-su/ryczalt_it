ALTER TABLE ryczalt.app_users
    ADD COLUMN birth_date DATE,
    ADD COLUMN google_subject VARCHAR(255);

CREATE UNIQUE INDEX uq_app_users_google_subject
    ON ryczalt.app_users (google_subject)
    WHERE google_subject IS NOT NULL;

COMMENT ON COLUMN ryczalt.app_users.birth_date IS
    'Legacy/import compatibility only; canonical taxpayer date of birth is ryczalt_profile.date_of_birth.';
COMMENT ON COLUMN ryczalt.app_users.google_subject IS
    'Authentication identity: external Google subject identifier.';
COMMENT ON COLUMN ryczalt.portfolios.owner IS
    'Legacy/import compatibility only; access ownership is represented by user_id and profile_memberships.';

ALTER TABLE ryczalt.portfolios
    ADD COLUMN taxpayer_nip VARCHAR(10),
    ADD COLUMN taxpayer_full_name VARCHAR(240),
    ADD COLUMN taxpayer_first_name VARCHAR(120),
    ADD COLUMN taxpayer_surname VARCHAR(160),
    ADD COLUMN taxpayer_date_of_birth DATE,
    ADD COLUMN taxpayer_tax_office_code VARCHAR(4),
    ADD COLUMN taxpayer_email VARCHAR(255),
    ADD COLUMN tax_micro_account VARCHAR(34),
    ADD COLUMN zus_payment_account VARCHAR(34);

COMMENT ON COLUMN ryczalt.portfolios.taxpayer_nip IS
    'Legacy/import compatibility only; canonical taxpayer data belongs to ryczalt_profile.';
COMMENT ON COLUMN ryczalt.portfolios.taxpayer_full_name IS
    'Legacy/import compatibility only; canonical taxpayer data belongs to ryczalt_profile.';
COMMENT ON COLUMN ryczalt.portfolios.taxpayer_first_name IS
    'Legacy/import compatibility only; canonical taxpayer data belongs to ryczalt_profile.';
COMMENT ON COLUMN ryczalt.portfolios.taxpayer_surname IS
    'Legacy/import compatibility only; canonical taxpayer data belongs to ryczalt_profile.';
COMMENT ON COLUMN ryczalt.portfolios.taxpayer_date_of_birth IS
    'Legacy/import compatibility only; canonical taxpayer data belongs to ryczalt_profile.';
COMMENT ON COLUMN ryczalt.portfolios.taxpayer_tax_office_code IS
    'Legacy/import compatibility only; canonical taxpayer data belongs to ryczalt_profile.';
COMMENT ON COLUMN ryczalt.portfolios.taxpayer_email IS
    'Legacy/import compatibility only; canonical taxpayer data belongs to ryczalt_profile.';
COMMENT ON COLUMN ryczalt.portfolios.tax_micro_account IS
    'Legacy/import compatibility only; canonical payment account belongs to ryczalt_profile.';
COMMENT ON COLUMN ryczalt.portfolios.zus_payment_account IS
    'Legacy/import compatibility only; canonical payment account belongs to ryczalt_profile.';
