import { Router } from 'express';
import { LedgerController } from '../controllers/ledger.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const r = Router();

r.get('/balance', auth(true), requireRole(['ADMIN']), LedgerController.balance,);
r.get('/check', auth(true), requireRole(['ADMIN']), LedgerController.check,);

export default r;
