import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const r = Router();

r.get('/', auth(true), requireRole(['STAFF', 'ADMIN']), CustomerController.list);
r.get('/detail', auth(true), requireRole(['STAFF', 'ADMIN']), CustomerController.detail);
r.post('/', auth(true), requireRole(['CUSTOMER']), CustomerController.updateProfile);
r.post('/kyc', auth(true), requireRole(['CUSTOMER']), CustomerController.submitKyc);

export default r;
