
-- =============================================================
-- Digital Banking Database Schema (PostgreSQL)
-- Includes: RBAC, KYC, Accounts, Double-Entry Ledger, Transfers,
--           Support tables, PK/FK, CHECKs, indexes, and triggers.
-- =============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;    -- case-insensitive text

-- =============================================================
-- 1) ENUM TYPES
-- =============================================================
DO $$ BEGIN
  CREATE TYPE currency_code  AS ENUM ('VND','USD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE account_type   AS ENUM ('CURRENT','SAVINGS','WALLET');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('ACTIVE','FROZEN','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transfer_status AS ENUM ('PENDING','COMPLETED','FAILED','CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM ('PENDING','APPROVED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gl_type AS ENUM ('ASSET','LIABILITY','INCOME','EXPENSE','EQUITY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dc_type AS ENUM ('DEBIT','CREDIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================
-- 2) RBAC: ROLES, PERMISSIONS, ASSIGNMENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS role (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,      -- 'CUSTOMER','STAFF','ADMIN','AUDITOR'
  name        TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS permission (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,      -- 'VIEW_ACCOUNT','CREATE_TRANSFER',...
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permission (
  role_id       UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- =============================================================
-- 3) USERS & CUSTOMERS (KYC)
-- =============================================================
CREATE TABLE IF NOT EXISTS app_user (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users can have multiple roles (many-to-many)
CREATE TABLE IF NOT EXISTS user_role (
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS customer (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE REFERENCES app_user(id) ON DELETE SET NULL,
  full_name     TEXT NOT NULL,
  dob           DATE,
  national_id   TEXT,           -- CCCD/CMND
  address       TEXT,
  kyc           kyc_status NOT NULL DEFAULT 'PENDING',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kyc_document (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  doc_type     TEXT NOT NULL,        -- 'CCCD_FRONT','SELFIE',...
  url          TEXT NOT NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kyc_document_customer ON kyc_document(customer_id);

-- updated_at helpers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_user_updated_at ON app_user;
CREATE TRIGGER trg_app_user_updated_at
BEFORE UPDATE ON app_user
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_customer_updated_at ON customer;
CREATE TRIGGER trg_customer_updated_at
BEFORE UPDATE ON customer
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- 4) ACCOUNTS & BENEFICIARIES
-- =============================================================
CREATE TABLE IF NOT EXISTS account (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
  account_no    TEXT UNIQUE NOT NULL,
  type          account_type NOT NULL,
  currency      currency_code NOT NULL DEFAULT 'VND',
  balance       NUMERIC(18,2) NOT NULL DEFAULT 0,
  status        account_status NOT NULL DEFAULT 'ACTIVE',
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at     TIMESTAMPTZ,
  CHECK (balance >= 0)
);
CREATE INDEX IF NOT EXISTS idx_account_customer ON account(customer_id);
CREATE INDEX IF NOT EXISTS idx_account_status   ON account(status);

CREATE TABLE IF NOT EXISTS account_limit (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID NOT NULL UNIQUE REFERENCES account(id) ON DELETE CASCADE,
  daily_outward_limit  NUMERIC(18,2) NOT NULL DEFAULT 50000000.00,
  per_txn_limit        NUMERIC(18,2) NOT NULL DEFAULT 20000000.00
);

CREATE TABLE IF NOT EXISTS beneficiary (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id          UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  alias                TEXT,
  target_account_no    TEXT NOT NULL,
  target_bank_code     TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, target_account_no, target_bank_code)
);
CREATE INDEX IF NOT EXISTS idx_beneficiary_customer ON beneficiary(customer_id);

-- =============================================================
-- 5) GENERAL LEDGER (DOUBLE-ENTRY)
-- =============================================================
CREATE TABLE IF NOT EXISTS gl_account (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code      TEXT UNIQUE NOT NULL,      -- e.g., '101001'
  name      TEXT NOT NULL,
  type      gl_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS journal_entry (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref          TEXT,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS journal_line (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id              UUID NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
  gl_account_id         UUID NOT NULL REFERENCES gl_account(id) ON DELETE RESTRICT,
  customer_account_id   UUID REFERENCES account(id) ON DELETE SET NULL,
  dc                    dc_type NOT NULL,
  amount                NUMERIC(18,2) NOT NULL CHECK (amount > 0)
);
CREATE INDEX IF NOT EXISTS idx_jl_entry ON journal_line(entry_id);
CREATE INDEX IF NOT EXISTS idx_jl_customer_account ON journal_line(customer_account_id);

-- Enforce double-entry balance per entry_id
CREATE OR REPLACE FUNCTION enforce_double_entry_row()
RETURNS TRIGGER AS $$
DECLARE
  v_entry UUID;
  total_debit NUMERIC(18,2);
  total_credit NUMERIC(18,2);
BEGIN
  v_entry := COALESCE(NEW.entry_id, OLD.entry_id);

  SELECT
    COALESCE(SUM(CASE WHEN dc='DEBIT'  THEN amount ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN dc='CREDIT' THEN amount ELSE 0 END),0)
  INTO total_debit, total_credit
  FROM journal_line
  WHERE entry_id = v_entry;

  IF total_debit <> total_credit THEN
    RAISE EXCEPTION 'Journal entry % is not balanced (debit=%, credit=%)',
      v_entry, total_debit, total_credit;
  END IF;

  RETURN NULL;
END; $$ LANGUAGE plpgsql;

-- Use constraint triggers so they fire after the statement completes
DROP TRIGGER IF EXISTS trg_enforce_double_entry_insupd ON journal_line;
DROP TRIGGER IF EXISTS trg_enforce_double_entry_del ON journal_line;

CREATE CONSTRAINT TRIGGER trg_enforce_double_entry_insupd
AFTER INSERT OR UPDATE ON journal_line
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_double_entry_row();

CREATE CONSTRAINT TRIGGER trg_enforce_double_entry_del
AFTER DELETE ON journal_line
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_double_entry_row();

-- =============================================================
-- 6) TRANSFERS (BUSINESS TRANSACTION)
-- =============================================================
CREATE TABLE IF NOT EXISTS transfer (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id        UUID NOT NULL REFERENCES account(id) ON DELETE RESTRICT,
  to_account_id          UUID REFERENCES account(id) ON DELETE RESTRICT,  -- internal
  to_external_account_no TEXT,
  to_external_bank_code  TEXT,
  currency               currency_code NOT NULL DEFAULT 'VND',
  amount                 NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  fee                    NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  idem_key               TEXT UNIQUE NOT NULL,
  status                 transfer_status NOT NULL DEFAULT 'PENDING',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at           TIMESTAMPTZ,
  CHECK (
    -- Either internal transfer (to_account_id) OR external (both external fields present)
    (to_account_id IS NOT NULL)
    OR
    (to_external_account_no IS NOT NULL AND to_external_bank_code IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_transfer_from ON transfer(from_account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transfer_to   ON transfer(to_account_id, created_at);

-- =============================================================
-- 7) SUPPORT TABLES: Idempotency, Outbox, OTP, Notification, Audit
-- =============================================================
CREATE TABLE IF NOT EXISTS idempotency_key (
  key         TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  purpose     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox_event (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL,
  payload     JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published   BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_outbox_unpub ON outbox_event(published, occurred_at);

CREATE TABLE IF NOT EXISTS otp (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  purpose     TEXT NOT NULL,      -- e.g., 'TRANSFER'
  expire_at   TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_otp_user ON otp(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_expire ON otp(expire_at);

CREATE TABLE IF NOT EXISTS notification (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_user ON notification(user_id, is_read);

CREATE TABLE IF NOT EXISTS app_audit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  action      TEXT NOT NULL,
  ref_id      UUID,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_audit_user ON app_audit(user_id, created_at);

-- =============================================================
-- 8) SEED DATA (OPTIONAL)
-- =============================================================
INSERT INTO role (code, name) VALUES
  ('CUSTOMER','Khách hàng'),
  ('STAFF','Nhân viên'),
  ('ADMIN','Quản trị hệ thống'),
  ('AUDITOR','Kiểm toán')
ON CONFLICT (code) DO NOTHING;

INSERT INTO gl_account (code, name, type) VALUES
 ('101001','Cash / Settlement In-Process','ASSET'),
 ('201001','Customer Deposits','LIABILITY'),
 ('401001','Fee Income','INCOME')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE journal_entry ADD CONSTRAINT uq_journal_entry_ref UNIQUE (ref);
ALTER TABLE transfer ADD CONSTRAINT uq_transfer_idem_key UNIQUE (idem_key);
ALTER TABLE app_user ADD CONSTRAINT uq_app_user_email UNIQUE (email);
ALTER TABLE account ADD CONSTRAINT uq_account_no UNIQUE (account_no);
ALTER TABLE role ADD CONSTRAINT uq_role_code UNIQUE (code);
ALTER TABLE permission ADD CONSTRAINT uq_permission_code UNIQUE (code);

ALTER TABLE kyc_document
ADD CONSTRAINT uq_kyc_per_type_per_customer
UNIQUE (customer_id, doc_type);


-- =============================================================
-- Notes:
-- - ACID: Use transactions in application code (BEGIN ... COMMIT) with
--   isolation level SERIALIZABLE for critical money flows.
-- - Double-entry enforced via DEFERRABLE CONSTRAINT TRIGGERS.
-- - Idempotency: 'transfer.idem_key' UNIQUE; optional global keys in 'idempotency_key'.
-- - All monetary amounts use NUMERIC(18,2).
-- =============================================================
