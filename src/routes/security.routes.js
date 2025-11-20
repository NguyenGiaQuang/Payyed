import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const r = Router();

// 33) GET /api/security/audit – Admin / Auditor
r.get(
    '/audit',
    auth(true),
    requireRole(['ADMIN', 'AUDITOR']),
    AuditController.list,
);

export default r;
