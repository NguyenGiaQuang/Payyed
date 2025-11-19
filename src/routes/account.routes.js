// src/routes/account.routes.js
import { Router } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const r = Router();

r.get('/', auth(true), AccountController.listCurrent);
r.get('/detail', auth(true), AccountController.detailByBody);
r.post('/', auth(true), requireRole(['STAFF', 'ADMIN']), AccountController.create);
r.patch('/status', auth(true), requireRole(['ADMIN']), AccountController.updateStatusByBody);
r.post('/statement', auth(true), AccountController.statementByBody);
r.get('/me', auth(true), AccountController.listCurrent);
r.post('/open', auth(true), requireRole(['STAFF', 'ADMIN']), AccountController.create);

export default r;
