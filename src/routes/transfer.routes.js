import { Router } from 'express';
import { TransferController } from '../controllers/transfer.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const r = Router();

r.post('/', auth(true), requireRole(['CUSTOMER']), TransferController.createInternal,);
r.get('/', auth(true), requireRole(['CUSTOMER', 'STAFF', 'ADMIN']), TransferController.list,);
r.get('/detail', auth(true), requireRole(['CUSTOMER', 'STAFF', 'ADMIN']), TransferController.detailByBody,);
r.post('/verify-otp', auth(true), requireRole(['CUSTOMER']), TransferController.verifyOtp,);
r.post('/external', auth(true), requireRole(['CUSTOMER']), TransferController.createExternal,);
r.post('/fee', auth(true), requireRole(['CUSTOMER']), TransferController.calcFee,);

export default r;
