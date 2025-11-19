// src/routes/customer.routes.js
import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const r = Router();

// 7) GET /api/customers – Staff / Admin
r.get('/', auth(true), requireRole(['STAFF', 'ADMIN']), CustomerController.list);

// 🔹 8) GET /api/customers/detail – Staff / Admin
// Body: { "customer_id": "<uuid>" }
r.get('/detail', auth(true), requireRole(['STAFF', 'ADMIN']), CustomerController.detail);

// 9) POST /api/customers – Customer cập nhật profile của chính mình
r.post('/', auth(true), requireRole(['CUSTOMER']), CustomerController.updateProfile);

// 🔹 10) POST /api/customers/kyc – Customer gửi hồ sơ KYC (body chứa customer_id)
// Body: { "customer_id": "<uuid>", "documents": [...] }
r.post('/kyc', auth(true), requireRole(['CUSTOMER']), CustomerController.submitKyc);

export default r;
