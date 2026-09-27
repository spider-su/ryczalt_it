ALTER TABLE ryczalt.app_users
    ADD COLUMN birth_date DATE,
    ADD COLUMN google_subject VARCHAR(255);

CREATE UNIQUE INDEX uq_app_users_google_subject
    ON ryczalt.app_users (google_subject)
    WHERE google_subject IS NOT NULL;

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
