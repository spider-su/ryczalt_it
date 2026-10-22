#!/usr/bin/env python3
"""Dry-run by default. Requires psycopg[binary] and standard PostgreSQL PG* env variables.

Fetches NBP historical facts independently. Changes only matching invoice FX metadata
and inserts audit events. Does not infer taxpayer facts or overwrite booked amounts.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen

import psycopg
from psycopg.rows import dict_row

SQL = Path(__file__).resolve().parents[1] / "src/main/resources/sql/maintenance/backfill_verified_invoice_fx.sql"
CANDIDATES = """
SELECT profile_id, id, currency, accounting_date
FROM ryczalt.ryczalt_invoice
WHERE currency <> 'PLN' AND fx_rate IS NULL AND fx_effective_date IS NULL
  AND fx_provider IS NULL AND fx_provider_reference IS NULL
ORDER BY profile_id, id
"""


def requested_date(accounting_date):
    date = accounting_date - timedelta(days=1)
    while date.weekday() >= 5:
        date -= timedelta(days=1)
    return date


def fetch(key):
    currency, requested = key
    start = requested - timedelta(days=6)
    url = f"https://api.nbp.pl/api/exchangerates/rates/a/{currency.lower()}/{start}/{requested}/?format=json"
    try:
        with urlopen(url, timeout=20) as response:
            data = json.loads(response.read(), parse_float=Decimal)
    except HTTPError as error:
        if error.code in (400, 404):
            return key, None
        raise RuntimeError(f"NBP verification failed: HTTP {error.code}") from None
    if data['code'].upper() != currency:
        raise RuntimeError("NBP returned an unexpected currency")
    observations = [r for r in data['rates'] if start.isoformat() <= r['effectiveDate'] <= requested.isoformat()]
    if not observations:
        return key, None
    rate = max(observations, key=lambda r: r['effectiveDate'])
    if Decimal(str(rate['mid'])) <= 0 or not rate.get('no'):
        raise RuntimeError("NBP returned an invalid observation")
    return key, rate


def run(connection, apply=False):
    connection.execute("SET LOCAL lock_timeout = '5s'")
    connection.execute("SET LOCAL statement_timeout = '30s'")
    rows = connection.execute(CANDIDATES).fetchall()
    keys = sorted({(r['currency'], requested_date(r['accounting_date'])) for r in rows})
    with ThreadPoolExecutor(max_workers=4) as pool:
        verified = dict(pool.map(fetch, keys))
    connection.execute("""
        CREATE TEMP TABLE verified_invoice_fx (
            profile_id bigint, invoice_id bigint, currency varchar(3),
            requested_date date, effective_date date, rate numeric(19,8),
            provider_reference varchar(256), PRIMARY KEY (profile_id, invoice_id)
        ) ON COMMIT DROP
        """)
    for row in rows:
        requested = requested_date(row['accounting_date'])
        rate = verified[(row['currency'], requested)]
        if rate is None:
            continue
        connection.execute("INSERT INTO verified_invoice_fx VALUES (%s,%s,%s,%s,%s,%s,%s)",
            (row['profile_id'], row['id'], row['currency'], requested,
             rate['effectiveDate'], rate['mid'], 'NBP-A-' + rate['effectiveDate']))
    # Snapshot every non-FX invoice field to reject concurrent/accidental accounting changes.
    before = connection.execute("""SELECT id, to_jsonb(i) - ARRAY[
        'fx_rate','fx_effective_date','fx_provider','fx_provider_reference','updated_at'] AS facts
        FROM ryczalt.ryczalt_invoice i ORDER BY id""").fetchall()
    sql = SQL.read_text()
    if not apply:
        # Avoid consuming audit-event sequence numbers during a rolled-back preview.
        sql = sql[:sql.index("INSERT INTO ryczalt.ryczalt_audit_event")] + "SELECT id FROM updated;"
    affected = len(connection.execute(sql).fetchall())
    after = connection.execute("""SELECT id, to_jsonb(i) - ARRAY[
        'fx_rate','fx_effective_date','fx_provider','fx_provider_reference','updated_at'] AS facts
        FROM ryczalt.ryczalt_invoice i ORDER BY id""").fetchall()
    if before != after:
        raise RuntimeError("Accounting facts changed; rolling back")
    report = {'mode': 'apply' if apply else 'dry-run', 'candidates': len(rows),
              'nbp_dates_verified': sum(v is not None for v in verified.values()),
              'nbp_dates_unavailable': sum(v is None for v in verified.values()),
              'invoices_matched': affected, 'audit_events': affected,
              'invoices_left_for_review': len(rows) - affected,
              'booked_amounts_changed': 0}
    if apply:
        connection.commit()
    else:
        connection.rollback()
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Commit verified metadata and audit events')
    args = parser.parse_args()
    with psycopg.connect(row_factory=dict_row) as connection:
        print(json.dumps(run(connection, apply=args.apply), sort_keys=True))
