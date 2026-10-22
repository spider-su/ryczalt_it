-- Move imported taxpayer facts into the canonical profile before removing the
-- duplicate compatibility columns. Abort rather than resolve conflicting data.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM ryczalt.portfolios p
        JOIN ryczalt.ryczalt_profile r ON r.profile_id = p.id
        WHERE (p.taxpayer_nip IS NOT NULL AND r.nip IS NOT NULL AND p.taxpayer_nip IS DISTINCT FROM r.nip)
           OR (p.taxpayer_full_name IS NOT NULL AND r.full_name IS NOT NULL AND p.taxpayer_full_name IS DISTINCT FROM r.full_name)
           OR (p.taxpayer_first_name IS NOT NULL AND r.first_name IS NOT NULL AND p.taxpayer_first_name IS DISTINCT FROM r.first_name)
           OR (p.taxpayer_surname IS NOT NULL AND r.surname IS NOT NULL AND p.taxpayer_surname IS DISTINCT FROM r.surname)
           OR (p.taxpayer_date_of_birth IS NOT NULL AND r.date_of_birth IS NOT NULL AND p.taxpayer_date_of_birth IS DISTINCT FROM r.date_of_birth)
           OR (p.taxpayer_tax_office_code IS NOT NULL AND r.tax_office_code IS NOT NULL AND p.taxpayer_tax_office_code IS DISTINCT FROM r.tax_office_code)
           OR (p.taxpayer_email IS NOT NULL AND r.email IS NOT NULL AND p.taxpayer_email IS DISTINCT FROM r.email)
           OR (p.tax_micro_account IS NOT NULL AND r.vat_payment_account IS NOT NULL AND p.tax_micro_account IS DISTINCT FROM r.vat_payment_account)
           OR (p.tax_micro_account IS NOT NULL AND r.ryczalt_payment_account IS NOT NULL AND p.tax_micro_account IS DISTINCT FROM r.ryczalt_payment_account)
           OR (p.zus_payment_account IS NOT NULL AND r.zus_payment_account IS NOT NULL AND p.zus_payment_account IS DISTINCT FROM r.zus_payment_account)
    ) THEN
        RAISE EXCEPTION 'Conflicting legacy and canonical profile fields; profile cleanup was stopped';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM ryczalt.app_users u
        WHERE u.birth_date IS NOT NULL
          AND (
              NOT EXISTS (
                  SELECT 1 FROM ryczalt.portfolios p WHERE p.user_id = u.id
              )
              OR EXISTS (
                  SELECT 1
                  FROM ryczalt.portfolios p
                  LEFT JOIN ryczalt.ryczalt_profile r ON r.profile_id = p.id
                  WHERE p.user_id = u.id
                    AND COALESCE(p.taxpayer_date_of_birth, r.date_of_birth) IS DISTINCT FROM u.birth_date
              )
          )
    ) THEN
        RAISE EXCEPTION 'An app user birth date has no matching taxpayer date; profile cleanup was stopped';
    END IF;
END;
$$;

INSERT INTO ryczalt.ryczalt_profile (
    profile_id,
    nip,
    full_name,
    tax_office_code,
    email,
    vat_payment_account,
    ryczalt_payment_account,
    zus_payment_account,
    first_name,
    surname,
    date_of_birth
)
SELECT
    p.id,
    p.taxpayer_nip,
    p.taxpayer_full_name,
    p.taxpayer_tax_office_code,
    p.taxpayer_email,
    p.tax_micro_account,
    p.tax_micro_account,
    p.zus_payment_account,
    p.taxpayer_first_name,
    p.taxpayer_surname,
    p.taxpayer_date_of_birth
FROM ryczalt.portfolios p
WHERE p.taxpayer_nip IS NOT NULL
   OR p.taxpayer_full_name IS NOT NULL
   OR p.taxpayer_first_name IS NOT NULL
   OR p.taxpayer_surname IS NOT NULL
   OR p.taxpayer_date_of_birth IS NOT NULL
   OR p.taxpayer_tax_office_code IS NOT NULL
   OR p.taxpayer_email IS NOT NULL
   OR p.tax_micro_account IS NOT NULL
   OR p.zus_payment_account IS NOT NULL
ON CONFLICT (profile_id) DO UPDATE SET
    nip = COALESCE(ryczalt.ryczalt_profile.nip, EXCLUDED.nip),
    full_name = COALESCE(ryczalt.ryczalt_profile.full_name, EXCLUDED.full_name),
    tax_office_code = COALESCE(ryczalt.ryczalt_profile.tax_office_code, EXCLUDED.tax_office_code),
    email = COALESCE(ryczalt.ryczalt_profile.email, EXCLUDED.email),
    vat_payment_account = COALESCE(ryczalt.ryczalt_profile.vat_payment_account, EXCLUDED.vat_payment_account),
    ryczalt_payment_account = COALESCE(ryczalt.ryczalt_profile.ryczalt_payment_account, EXCLUDED.ryczalt_payment_account),
    zus_payment_account = COALESCE(ryczalt.ryczalt_profile.zus_payment_account, EXCLUDED.zus_payment_account),
    first_name = COALESCE(ryczalt.ryczalt_profile.first_name, EXCLUDED.first_name),
    surname = COALESCE(ryczalt.ryczalt_profile.surname, EXCLUDED.surname),
    date_of_birth = COALESCE(ryczalt.ryczalt_profile.date_of_birth, EXCLUDED.date_of_birth);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM ryczalt.portfolios p
        LEFT JOIN ryczalt.ryczalt_profile r ON r.profile_id = p.id
        WHERE (p.taxpayer_nip IS NOT NULL AND p.taxpayer_nip IS DISTINCT FROM r.nip)
           OR (p.taxpayer_full_name IS NOT NULL AND p.taxpayer_full_name IS DISTINCT FROM r.full_name)
           OR (p.taxpayer_first_name IS NOT NULL AND p.taxpayer_first_name IS DISTINCT FROM r.first_name)
           OR (p.taxpayer_surname IS NOT NULL AND p.taxpayer_surname IS DISTINCT FROM r.surname)
           OR (p.taxpayer_date_of_birth IS NOT NULL AND p.taxpayer_date_of_birth IS DISTINCT FROM r.date_of_birth)
           OR (p.taxpayer_tax_office_code IS NOT NULL AND p.taxpayer_tax_office_code IS DISTINCT FROM r.tax_office_code)
           OR (p.taxpayer_email IS NOT NULL AND p.taxpayer_email IS DISTINCT FROM r.email)
           OR (p.tax_micro_account IS NOT NULL AND p.tax_micro_account IS DISTINCT FROM r.vat_payment_account)
           OR (p.tax_micro_account IS NOT NULL AND p.tax_micro_account IS DISTINCT FROM r.ryczalt_payment_account)
           OR (p.zus_payment_account IS NOT NULL AND p.zus_payment_account IS DISTINCT FROM r.zus_payment_account)
    ) THEN
        RAISE EXCEPTION 'Legacy profile values were not copied to the canonical profile; cleanup was stopped';
    END IF;
END;
$$;

-- These indexes duplicate the leading columns of their corresponding unique
-- indexes and are not needed by the current profile/period lookups.
DROP INDEX ryczalt.ix_ryczalt_obligation_period;
DROP INDEX ryczalt.ix_ryczalt_payment_account_rule_profile;

ALTER TABLE ryczalt.app_users
    DROP COLUMN birth_date;

ALTER TABLE ryczalt.portfolios
    DROP COLUMN taxpayer_nip,
    DROP COLUMN taxpayer_full_name,
    DROP COLUMN taxpayer_first_name,
    DROP COLUMN taxpayer_surname,
    DROP COLUMN taxpayer_date_of_birth,
    DROP COLUMN taxpayer_tax_office_code,
    DROP COLUMN taxpayer_email,
    DROP COLUMN tax_micro_account,
    DROP COLUMN zus_payment_account;
