// src/routes/kyc.routes.js
import { Router } from 'express';
import { KycController } from '../controllers/kyc.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const r = Router();

// 11) GET /api/kyc/pending – Staff
r.get('/pending', auth(true), requireRole(['STAFF']), KycController.pending);

// 🔹 12) PATCH /api/kyc/approve – Staff
// Body: { "customer_id": "<uuid>", "status": "APPROVED" | "REJECTED" }
r.patch('/approve', auth(true), requireRole(['STAFF']), KycController.approve);

export default r;
