import { Router } from 'express';
import { KycController } from '../controllers/kyc.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const r = Router();

r.get('/pending', auth(true), requireRole(['STAFF']), KycController.pending);
r.patch('/approve', auth(true), requireRole(['STAFF']), KycController.approve);

export default r;
