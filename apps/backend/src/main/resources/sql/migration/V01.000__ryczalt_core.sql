CREATE SCHEMA IF NOT EXISTS investory;
SET search_path TO investory, public;

CREATE TABLE investory.app_users (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(320) NOT NULL UNIQUE,
    email         VARCHAR(320),
    display_name  VARCHAR(255) NOT NULL,
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    password_hash VARCHAR(255),
    role          VARCHAR(32) NOT NULL DEFAULT 'USER',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_app_users_username_not_blank CHECK (btrim(username) <> ''),
    CONSTRAINT chk_app_users_display_name_not_blank CHECK (btrim(display_name) <> '')
);
CREATE UNIQUE INDEX uq_app_users_email_ci
    ON investory.app_users (lower(email))
    WHERE email IS NOT NULL;

CREATE TABLE investory.portfolios (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    base_currency  VARCHAR(3) NOT NULL DEFAULT 'PLN',
    local_currency VARCHAR(3) NOT NULL DEFAULT 'PLN',
    owner          VARCHAR(255),
    user_id        BIGINT NOT NULL REFERENCES investory.app_users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE investory.profile_memberships (
    user_id    BIGINT NOT NULL REFERENCES investory.app_users(id) ON DELETE CASCADE,
    profile_id BIGINT NOT NULL REFERENCES investory.portfolios(id) ON DELETE CASCADE,
    role       VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_profile_memberships PRIMARY KEY (user_id, profile_id),
    CONSTRAINT chk_profile_memberships_role CHECK (role IN ('OWNER', 'USER'))
);
CREATE INDEX ix_profile_memberships_profile
    ON investory.profile_memberships(profile_id, role);

CREATE TABLE investory.app_user_invitations (
    id             BIGSERIAL PRIMARY KEY,
    email          VARCHAR(320) NOT NULL,
    display_name   VARCHAR(255) NOT NULL,
    profile_id     BIGINT NOT NULL REFERENCES investory.portfolios(id) ON DELETE CASCADE,
    profile_role   VARCHAR(16) NOT NULL,
    token_hash     VARCHAR(64) NOT NULL UNIQUE,
    expires_at     TIMESTAMPTZ NOT NULL,
    consumed_at    TIMESTAMPTZ,
    created_by     BIGINT REFERENCES investory.app_users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_app_user_invitations_role CHECK (profile_role IN ('OWNER', 'USER')),
    CONSTRAINT chk_app_user_invitations_email_not_blank CHECK (btrim(email) <> ''),
    CONSTRAINT chk_app_user_invitations_display_name_not_blank CHECK (btrim(display_name) <> '')
);
CREATE INDEX ix_app_user_invitations_email
    ON investory.app_user_invitations (lower(email), expires_at)
    WHERE consumed_at IS NULL;

CREATE TABLE investory.integration_instances (
    id                BIGSERIAL PRIMARY KEY,
    owner_id          BIGINT REFERENCES investory.app_users(id) ON DELETE RESTRICT,
    plugin_id         VARCHAR(128) NOT NULL,
    plugin_type       VARCHAR(32) NOT NULL,
    enabled           BOOLEAN NOT NULL DEFAULT FALSE,
    config_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_test_at      TIMESTAMPTZ,
    last_test_status  VARCHAR(32),
    last_test_message VARCHAR(500),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_integration_instances_type
        CHECK (plugin_type IN ('BROKER_IMPORT','MARKET_DATA','FX_DATA','NOTIFICATION','AI','EXPORT','E_INVOICING')),
    CONSTRAINT ux_integration_instances_plugin_owner UNIQUE (owner_id, plugin_id, plugin_type)
);
CREATE UNIQUE INDEX ux_integration_instances_global_plugin
    ON investory.integration_instances(plugin_id, plugin_type)
    WHERE owner_id IS NULL;

CREATE TABLE investory.integration_secrets (
    id                      BIGSERIAL PRIMARY KEY,
    integration_instance_id BIGINT NOT NULL REFERENCES investory.integration_instances(id) ON DELETE CASCADE,
    secret_name             VARCHAR(128) NOT NULL,
    ciphertext              TEXT NOT NULL,
    key_version             VARCHAR(64) NOT NULL,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_integration_secrets_instance_name UNIQUE (integration_instance_id, secret_name)
);
