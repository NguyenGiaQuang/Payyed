import { Router } from 'express';
import { TransferController } from '../controllers/transfer.controller.js';
import { auth } from '../middlewares/auth.middleware.js';


const r = Router();
r.post('/internal', auth(true), TransferController.createInternal);
export default r;