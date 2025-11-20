import { Router } from 'express';
import { SystemController } from '../controllers/system.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const r = Router();

// 37) Health check – Admin
r.get(
    '/health',
    auth(true),
    requireRole(['ADMIN']),
    SystemController.health,
);

// 38) Stats – Admin
r.get(
    '/stats',
    auth(true),
    requireRole(['ADMIN']),
    SystemController.stats,
);

// 39) System logs – Admin / Auditor
r.get(
    '/logs',
    auth(true),
    requireRole(['ADMIN', 'AUDITOR']),
    SystemController.logs,
);

// 40) Retry outbox – Admin
r.post(
    '/outbox/retry',
    auth(true),
    requireRole(['ADMIN']),
    SystemController.retryOutbox,
);

export default r;
