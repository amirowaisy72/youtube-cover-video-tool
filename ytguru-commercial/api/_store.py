"""Database layer for the YT Guru license server (Phase 2).

Two backends, ONE SQL surface:

- Postgres (production, incl. Vercel): ``DATABASE_URL`` env var
  (``postgres://`` / ``postgresql://``), e.g. a Supabase free-tier
  Postgres. This is the only backend that may be used for real
  customers.
- SQLite (local dev only): ``license.db`` next to this module.

Why SQLite must never be used in production
--------------------------------------------
Vercel serverless functions run on an **ephemeral filesystem**: any
file the function writes (including a SQLite ``.db`` file) is thrown
away when the instance is recycled — minutes to hours later. A
SQLite-backed license server would silently LOSE every customer,
license key and credit balance on the next cold start. That is a
critical data-loss bug, not a minor limitation. The server refuses
to start on Vercel without ``DATABASE_URL`` (see ``connect()``).

How the single SQL surface works
---------------------------------
All SQL in ``app.py`` is written SQLite-style (``?`` placeholders).
The Postgres path translates it:

- ``?``  ->  ``%s``  (psycopg parameter style). No SQL string in
  this codebase contains a literal ``?`` outside placeholders.
- ``INSERT OR IGNORE INTO ...``  ->  ``INSERT INTO ... ON CONFLICT
  DO NOTHING`` (Postgres has no ``OR IGNORE``).
- ``BEGIN IMMEDIATE`` is never issued raw: ``consume`` calls
  ``begin_consume_txn()`` below, which takes a per-customer
  Postgres advisory lock (``pg_advisory_xact_lock`` — released
  automatically at transaction end, safe with Supabase's PgBouncer
  in transaction mode because the lock is transaction-scoped) or
  SQLite's ``BEGIN IMMEDIATE`` for local dev. Either way, two
  simultaneous consumes for the same customer are serialised, so
  the same credit can never be spent twice.
- ``ON CONFLICT(key) DO UPDATE ...`` upserts work unchanged in
  both engines (SQLite >= 3.24, all supported Postgres).
- Rows are always plain ``dict`` objects (``sqlite3.Row`` converted,
  psycopg ``dict_row``), so ``app.py`` never sees the difference.

Connection notes for Vercel + Supabase
---------------------------------------
Each serverless invocation opens one short-lived connection and
closes it when the request ends (the ``Connection`` context
manager). Use Supabase's **pooler** connection string (port 6543,
transaction mode) as ``DATABASE_URL`` — the free tier allows only
~15-60 direct connections and serverless bursts can exhaust them;
the pooler absorbs that. psycopg3 does not use server-side
prepared statements by default, so transaction-mode pooling is
safe here.
"""

from __future__ import annotations

import os
import re
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "license.db"

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
IS_POSTGRES = DATABASE_URL.startswith(("postgres://", "postgresql://"))
IS_VERCEL = os.environ.get("VERCEL") == "1"

# Match "INSERT OR IGNORE INTO <table> (<cols>) VALUES (<vals>)"
# and rewrite it for Postgres. The table must have a unique
# constraint/PK covering the row (settings.key is a PK), which is
# what makes bare ON CONFLICT DO NOTHING legal.
_INSERT_OR_IGNORE_RE = re.compile(
    r"INSERT OR IGNORE INTO\s+(\w+)\s*(\([^)]*\))\s*VALUES\s*(\([^)]*\))",
    re.IGNORECASE,
)


def _translate_pg(sql: str) -> str:
    sql = _INSERT_OR_IGNORE_RE.sub(
        r"INSERT INTO \1 \2 VALUES \3 ON CONFLICT DO NOTHING", sql)
    return sql.replace("?", "%s")


class _Cursor:
    """Thin wrapper: fetchone/fetchall always return plain dicts."""

    def __init__(self, raw, pg: bool):
        self._raw = raw
        self._pg = pg

    def fetchone(self):
        row = self._raw.fetchone()
        return dict(row) if row is not None else None

    def fetchall(self):
        return [dict(r) for r in self._raw.fetchall()]


class Connection:
    """Quacks like a sqlite3 connection (execute / executescript /
    commit / rollback / context manager) on either backend."""

    def __init__(self, raw, pg: bool):
        self._raw = raw
        self._pg = pg

    def execute(self, sql, params=()):
        if self._pg:
            sql = _translate_pg(sql)
        return _Cursor(self._raw.execute(sql, params), self._pg)

    def executescript(self, sql: str):
        if self._pg:
            for stmt in (s.strip() for s in sql.split(";")):
                if stmt:
                    self.execute(stmt)
        else:
            self._raw.executescript(sql)

    def commit(self):
        self._raw.commit()

    def rollback(self):
        self._raw.rollback()

    def close(self):
        self._raw.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        try:
            if exc_type is None:
                self._raw.commit()
            else:
                self._raw.rollback()
        finally:
            self._raw.close()
        return False


def connect() -> Connection:
    """Open one short-lived connection. On Vercel without
    DATABASE_URL this raises loudly instead of silently using a
    throwaway SQLite file that would lose all customer data."""
    if IS_POSTGRES:
        import psycopg
        from psycopg.rows import dict_row

        raw = psycopg.connect(DATABASE_URL, row_factory=dict_row)
        return Connection(raw, pg=True)
    if IS_VERCEL:
        raise RuntimeError(
            "DATABASE_URL is not set. On Vercel the license server "
            "must use Postgres (e.g. Supabase free tier): SQLite "
            "files are wiped on every serverless recycle and all "
            "customers/credits would be lost. See DESIGN.md §4.4."
        )
    raw = sqlite3.connect(str(DB_PATH))
    raw.row_factory = sqlite3.Row
    return Connection(raw, pg=False)


def begin_consume_txn(con: Connection, customer_id: str) -> None:
    """Serialise consumes for one customer.

    Must be called inside the ``with connect() as con:`` block,
    before the balance check. Postgres: per-customer advisory lock
    held until the transaction commits/rolls back. SQLite: an
    immediate (write) transaction.
    """
    if IS_POSTGRES:
        con.execute(
            "SELECT pg_advisory_xact_lock(hashtext(%s))", (customer_id,))
    else:
        con.execute("BEGIN IMMEDIATE")
