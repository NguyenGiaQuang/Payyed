// src/routes/cash_transaction.routes.js
import { Router } from 'express';
import { CashTransactionController } from '../controllers/cash_transaction.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const r = Router();

// CUSTOMER: gửi yêu cầu nạp/rút
r.post('/request', auth(true), CashTransactionController.request);

// LIST: cả CUSTOMER & STAFF dùng chung, service tự lọc theo role
r.get('/', auth(true), CashTransactionController.list);

// STAFF/ADMIN: duyệt / từ chối
r.patch(
    '/approve',
    auth(true),
    requireRole(['STAFF', 'ADMIN']),
    CashTransactionController.approve,
);

export default r;
