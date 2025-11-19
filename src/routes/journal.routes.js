import { Router } from 'express';
import { JournalController } from '../controllers/journal.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const r = Router();

r.get('/', auth(true), requireRole(['STAFF', 'ADMIN']), JournalController.list,);
r.get('/detail', auth(true), requireRole(['STAFF', 'ADMIN']), JournalController.detailByBody,);

export default r;
