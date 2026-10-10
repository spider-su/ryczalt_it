CREATE TABLE ryczalt.integration_jobs (
    id BIGSERIAL PRIMARY KEY,
    integration_instance_id BIGINT NOT NULL REFERENCES ryczalt.integration_instances(id) ON DELETE CASCADE,
    job_type VARCHAR(128) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    cron VARCHAR(128) NOT NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Warsaw',
    parameters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_started_at TIMESTAMPTZ,
    last_completed_at TIMESTAMPTZ,
    last_status VARCHAR(32),
    last_error VARCHAR(500),
    CONSTRAINT ux_integration_jobs_instance_type UNIQUE (integration_instance_id, job_type),
    CONSTRAINT chk_integration_jobs_status
        CHECK (last_status IS NULL OR last_status IN ('STARTED', 'SUCCESS', 'FAILED', 'SKIPPED'))
);

CREATE INDEX ix_integration_jobs_enabled ON ryczalt.integration_jobs(enabled);

INSERT INTO ryczalt.integration_jobs (integration_instance_id, job_type, enabled, cron, timezone)
SELECT id, 'sync-invoices', TRUE, '0 0 2 * * *', 'Europe/Warsaw'
FROM ryczalt.integration_instances
WHERE owner_id IS NULL AND plugin_id = 'ksef' AND plugin_type = 'E_INVOICING'
ON CONFLICT (integration_instance_id, job_type) DO NOTHING;
