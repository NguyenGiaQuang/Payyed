
-- =============================================================
-- Digital Banking Seed Data
-- Compatible with schema in banking_schema.sql
-- =============================================================

-- Ensure baseline GL and Roles exist (idempotent upserts)
INSERT INTO role (code, name) VALUES
  ('CUSTOMER','Khách hàng'),
  ('STAFF','Nhân viên'),
  ('ADMIN','Quản trị hệ thống'),
  ('AUDITOR','Kiểm toán')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission (code, description) VALUES
 ('VIEW_SELF_ACCOUNT','Xem tài khoản của chính mình'),
 ('CREATE_TRANSFER','Tạo giao dịch chuyển tiền'),
 ('APPROVE_KYC','Duyệt hồ sơ KYC'),
 ('VIEW_AUDIT','Xem nhật ký kiểm toán'),
 ('MANAGE_USER','Quản trị người dùng'),
 ('REQUEST_CASH','Tạo yêu cầu nạp/rút tiền'),
 ('APPROVE_CASH','Duyệt yêu cầu nạp/rút tiền')
ON CONFLICT (code) DO NOTHING;

-- INSERT INTO role_permission (role_id, permission_id)
-- SELECT r.id, p.id
-- FROM role r
-- JOIN permission p ON p.code IN (
--   CASE r.code
--     WHEN 'CUSTOMER' THEN 'VIEW_SELF_ACCOUNT'
--     WHEN 'CUSTOMER' THEN 'CREATE_TRANSFER'
--   END
-- )
-- WHERE r.code = 'CUSTOMER'
-- ON CONFLICT DO NOTHING;

-- Grant CUSTOMER permissions (xem tài khoản, chuyển tiền, yêu cầu nạp/rút)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN ('VIEW_SELF_ACCOUNT','CREATE_TRANSFER','REQUEST_CASH')
WHERE r.code = 'CUSTOMER'
ON CONFLICT DO NOTHING;

-- -- Grant STAFF permissions
-- INSERT INTO role_permission (role_id, permission_id)
-- SELECT r.id, p.id
-- FROM role r
-- JOIN permission p ON p.code IN ('APPROVE_KYC','VIEW_AUDIT')
-- WHERE r.code = 'STAFF'
-- ON CONFLICT DO NOTHING;

-- Grant STAFF permissions (duyệt KYC, xem audit, duyệt nạp/rút)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN ('APPROVE_KYC','VIEW_AUDIT','APPROVE_CASH')
WHERE r.code = 'STAFF'
ON CONFLICT DO NOTHING;

-- Grant ADMIN broad permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON TRUE
WHERE r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- GL accounts
INSERT INTO gl_account (code, name, type) VALUES
 ('101001','Cash / Settlement In-Process','ASSET'),
 ('201001','Customer Deposits','LIABILITY'),
 ('401001','Fee Income','INCOME')
ON CONFLICT (code) DO NOTHING;

-- =============================================================
-- Users
-- Passwords are hashed in application layer; here we use placeholders
-- =============================================================
INSERT INTO app_user (email, password_hash, is_active)
VALUES
 ('alice@example.com',  '$2a$10$PLACEHOLDERHASHALICE', TRUE),
 ('bob@example.com',    '$2a$10$PLACEHOLDERHASHBOB',   TRUE),
 ('staff@example.com',  '$2a$10$PLACEHOLDERHASHSTAFF', TRUE),
 ('admin@example.com',  '$2a$10$PLACEHOLDERHASHADMIN', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Assign roles
INSERT INTO user_role (user_id, role_id)
SELECT u.id, r.id
FROM app_user u
JOIN role r ON r.code = 'CUSTOMER'
WHERE u.email IN ('alice@example.com','bob@example.com')
ON CONFLICT DO NOTHING;

INSERT INTO user_role (user_id, role_id)
SELECT u.id, r.id FROM app_user u JOIN role r ON r.code='STAFF'
WHERE u.email='staff@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO user_role (user_id, role_id)
SELECT u.id, r.id FROM app_user u JOIN role r ON r.code='ADMIN'
WHERE u.email='admin@example.com'
ON CONFLICT DO NOTHING;

-- =============================================================
-- Customers & KYC
-- =============================================================
INSERT INTO customer (user_id, full_name, dob, national_id, address, kyc)
VALUES
 ((SELECT id FROM app_user WHERE email='alice@example.com'),'Nguyễn Thị Alice','2002-05-20','012345678901','123 Lê Lợi, Hà Nội','APPROVED'),
 ((SELECT id FROM app_user WHERE email='bob@example.com'),'Trần Văn Bob','2001-11-12','098765432109','456 Trường Chinh, TP.HCM','APPROVED')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO kyc_document (customer_id, doc_type, url)
VALUES
 ((SELECT id FROM customer WHERE user_id = (SELECT id FROM app_user WHERE email='alice@example.com')), 'CCCD_FRONT','/uploads/alice_cccd_front.jpg'),
 ((SELECT id FROM customer WHERE user_id = (SELECT id FROM app_user WHERE email='alice@example.com')), 'SELFIE','/uploads/alice_selfie.jpg'),
 ((SELECT id FROM customer WHERE user_id = (SELECT id FROM app_user WHERE email='bob@example.com')), 'CCCD_FRONT','/uploads/bob_cccd_front.jpg')
ON CONFLICT DO NOTHING;

-- =============================================================
-- Accounts & Limits & Beneficiaries
-- =============================================================
-- Opening balances will be set to final state after journal postings for consistency
-- Alice account A
INSERT INTO account (customer_id, account_no, type, currency, balance, status)
VALUES (
  (SELECT id FROM customer WHERE user_id = (SELECT id FROM app_user WHERE email='alice@example.com')),
  '10000001','CURRENT','VND', 8995000.00,'ACTIVE'  -- final balance after seed transactions
)
ON CONFLICT (account_no) DO NOTHING;

-- Bob account B
INSERT INTO account (customer_id, account_no, type, currency, balance, status)
VALUES (
  (SELECT id FROM customer WHERE user_id = (SELECT id FROM app_user WHERE email='bob@example.com')),
  '10000002','CURRENT','VND', 3000000.00,'ACTIVE'
)
ON CONFLICT (account_no) DO NOTHING;

INSERT INTO account_limit (account_id, daily_outward_limit, per_txn_limit)
VALUES
 ((SELECT id FROM account WHERE account_no='10000001'), 50000000.00, 20000000.00),
 ((SELECT id FROM account WHERE account_no='10000002'), 50000000.00, 20000000.00)
ON CONFLICT (account_id) DO NOTHING;

INSERT INTO beneficiary (customer_id, alias, target_account_no, target_bank_code)
VALUES
 ((SELECT id FROM customer WHERE user_id = (SELECT id FROM app_user WHERE email='alice@example.com')), 'Bob ví dụ', '10000002', 'BANKINT'),
 ((SELECT id FROM customer WHERE user_id = (SELECT id FROM app_user WHERE email='bob@example.com')), 'Alice ví dụ', '10000001', 'BANKINT')
ON CONFLICT DO NOTHING;

-- =============================================================
-- Initial Journal Entries: Seed opening deposits
-- =============================================================
-- Alice initial deposit 10,000,000
INSERT INTO journal_entry (ref, description, created_at)
VALUES ('INIT-ALICE-DEP','Initial deposit for Alice', now())
ON CONFLICT (ref) DO NOTHING;

INSERT INTO journal_line (entry_id, gl_account_id, customer_account_id, dc, amount)
SELECT je.id, ga_cash.id, NULL, 'DEBIT', 10000000.00
FROM journal_entry je, gl_account ga_cash
WHERE je.ref='INIT-ALICE-DEP' AND ga_cash.code='101001'
ON CONFLICT DO NOTHING;

INSERT INTO journal_line (entry_id, gl_account_id, customer_account_id, dc, amount)
SELECT je.id, ga_dep.id, (SELECT id FROM account WHERE account_no='10000001'), 'CREDIT', 10000000.00
FROM journal_entry je, gl_account ga_dep
WHERE je.ref='INIT-ALICE-DEP' AND ga_dep.code='201001'
ON CONFLICT DO NOTHING;

-- Bob initial deposit 2,000,000
INSERT INTO journal_entry (ref, description, created_at)
VALUES ('INIT-BOB-DEP','Initial deposit for Bob', now())
ON CONFLICT (ref) DO NOTHING;

INSERT INTO journal_line (entry_id, gl_account_id, customer_account_id, dc, amount)
SELECT je.id, ga_cash.id, NULL, 'DEBIT', 2000000.00
FROM journal_entry je, gl_account ga_cash
WHERE je.ref='INIT-BOB-DEP' AND ga_cash.code='101001'
ON CONFLICT DO NOTHING;

INSERT INTO journal_line (entry_id, gl_account_id, customer_account_id, dc, amount)
SELECT je.id, ga_dep.id, (SELECT id FROM account WHERE account_no='10000002'), 'CREDIT', 2000000.00
FROM journal_entry je, gl_account ga_dep
WHERE je.ref='INIT-BOB-DEP' AND ga_dep.code='201001'
ON CONFLICT DO NOTHING;

-- =============================================================
-- Transfer: Alice -> Bob amount 1,000,000 fee 5,000 (COMPLETED)
-- =============================================================
INSERT INTO transfer (
  from_account_id, to_account_id, currency, amount, fee, idem_key, status, created_at, completed_at
)
VALUES (
  (SELECT id FROM account WHERE account_no='10000001'),
  (SELECT id FROM account WHERE account_no='10000002'),
  'VND', 1000000.00, 5000.00, 'idem-TX-0001', 'COMPLETED', now(), now()
)
ON CONFLICT (idem_key) DO NOTHING;

-- Journal for TX-0001 (double-entry, balanced)
INSERT INTO journal_entry (ref, description, created_at)
VALUES ('TX-0001','Alice -> Bob 1,000,000 VND, fee 5,000', now())
ON CONFLICT (ref) DO NOTHING;

-- 1) Decrease Alice deposit (transfer amount): DEBIT Deposits (Alice) 1,000,000
INSERT INTO journal_line (entry_id, gl_account_id, customer_account_id, dc, amount)
SELECT je.id, ga_dep.id, (SELECT id FROM account WHERE account_no='10000001'), 'DEBIT', 1000000.00
FROM journal_entry je, gl_account ga_dep
WHERE je.ref='TX-0001' AND ga_dep.code='201001'
ON CONFLICT DO NOTHING;

-- 2) Increase Bob deposit (receive amount): CREDIT Deposits (Bob) 1,000,000
INSERT INTO journal_line (entry_id, gl_account_id, customer_account_id, dc, amount)
SELECT je.id, ga_dep.id, (SELECT id FROM account WHERE account_no='10000002'), 'CREDIT', 1000000.00
FROM journal_entry je, gl_account ga_dep
WHERE je.ref='TX-0001' AND ga_dep.code='201001'
ON CONFLICT DO NOTHING;

-- 3) Fee: Debit Deposits (Alice) 5,000; Credit Fee Income 5,000
INSERT INTO journal_line (entry_id, gl_account_id, customer_account_id, dc, amount)
SELECT je.id, ga_dep.id, (SELECT id FROM account WHERE account_no='10000001'), 'DEBIT', 5000.00
FROM journal_entry je, gl_account ga_dep
WHERE je.ref='TX-0001' AND ga_dep.code='201001'
ON CONFLICT DO NOTHING;

INSERT INTO journal_line (entry_id, gl_account_id, customer_account_id, dc, amount)
SELECT je.id, ga_fee.id, NULL, 'CREDIT', 5000.00
FROM journal_entry je, gl_account ga_fee
WHERE je.ref='TX-0001' AND ga_fee.code='401001'
ON CONFLICT DO NOTHING;

-- =============================================================
-- Misc support rows
-- =============================================================
INSERT INTO notification (user_id, title, body)
VALUES
 ((SELECT id FROM app_user WHERE email='alice@example.com'),'Thông báo', 'Bạn đã chuyển 1.005.000 VND (bao gồm phí) cho Bob.'),
 ((SELECT id FROM app_user WHERE email='bob@example.com'),'Thông báo', 'Bạn đã nhận 1.000.000 VND từ Alice.')
ON CONFLICT DO NOTHING;

INSERT INTO otp (user_id, code_hash, purpose, expire_at, consumed_at)
VALUES
 ((SELECT id FROM app_user WHERE email='alice@example.com'), 'HASHED_OTP_SAMPLE', 'TRANSFER', now() + interval '5 minutes', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO app_audit (user_id, action, ref_id, meta)
VALUES
 ((SELECT id FROM app_user WHERE email='alice@example.com'), 'CREATE_TRANSFER', NULL, '{"amount":1000000,"fee":5000,"to":"10000002"}'),
 ((SELECT id FROM app_user WHERE email='bob@example.com'), 'VIEW_ACCOUNT', NULL, '{"account_no":"10000002"}')
ON CONFLICT DO NOTHING;

-- Optional global idempotency record
INSERT INTO idempotency_key (key, purpose) VALUES ('idem-TX-0001','TRANSFER')
ON CONFLICT DO NOTHING;

-- =============================================================
-- Final sanity notes:
-- - Account balances were set to match GL postings:
--   Alice: 10,000,000 - 1,000,000 - 5,000 = 8,995,000
--   Bob:   2,000,000 + 1,000,000 = 3,000,000
-- - Double-entry constraint triggers will enforce balanced entries per ref.
-- =============================================================
